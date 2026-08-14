"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// Original777 — virtual-coin High-Low card game. wagering or cash-out.

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠️", "♥️", "♦️", "♣️"];

function drawCard() {
 const rankIndex = Math.floor(Math.random() * RANKS.length);
 const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
 return { rankIndex, rank: RANKS[rankIndex], suit };
}

export default function Original777Page() {
 const { user, profile, loading } = useAuth();
 const [stake, setStake] = useState(0);
 const [sessionId, setSessionId] = useState(null);
 const [walletBusy, setWalletBusy] = useState(false);
 const [current, setCurrent] = useState(drawCard());
 const [next, setNext] = useState(null);
 const [streak, setStreak] = useState(0);
 const [best, setBest] = useState(0);
 const [message, setMessage] = useState("Guess: will the next card be Higher or Lower?");
 const [revealing, setRevealing] = useState(false);

 useEffect(() => {
 if (!sessionId) return;
 const scoreValue = Number(streak) || 0;
 const reward = scoreToReward(scoreValue, { entryCoins: stake, multiplier: 2 });
 // Action games settle after their visible result is produced.
 if ((next != null)) { settleGameSession({ sessionId, uid: user.uid, gameId: "highlow", score: scoreValue, rewardCoins: reward, outcome: "finished" }).catch(() => {}); setSessionId(null); }
 }, [streak, sessionId]);

 if (loading || !user) {
 return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
 }

 async function guess(direction) {
 if (walletBusy) return;
 setWalletBusy(true);
 let sid;
 try { sid = await beginGameSession({ uid: user.uid, gameId: "highlow", entryCoins: stake }); setSessionId(sid); }
 catch (e) { alert(e.message || "Unable to start game"); return; }
 finally { setWalletBusy(false); }

 if (revealing) return;
 setRevealing(true);
 const drawn = drawCard();
 setNext(drawn);

 setTimeout(() => {
 let correct;
 if (drawn.rankIndex === current.rankIndex) {
 correct = null; // tie — push, no change
 } else if (direction === "higher") {
 correct = drawn.rankIndex > current.rankIndex;
 } else {
 correct = drawn.rankIndex < current.rankIndex;
 }

 if (correct === null) {
 setMessage(`🔁 Tie! Both ${drawn.rank}. Streak safe.`);
 } else if (correct) {
 setStreak((s) => {
 const ns = s + 1;
 setBest((b) => Math.max(b, ns));
 return ns;
 });
 setMessage(`✅ Correct! ${drawn.rank}${drawn.suit} was ${direction}.`);
 } else {
 setStreak(0);
 setMessage(`❌ Nope, ${drawn.rank}${drawn.suit} — streak reset.`);
 }
 setCurrent(drawn);
 setNext(null);
 setRevealing(false);
 }, 700);
 }

 function resetGame() {
 setCurrent(drawCard());
 setNext(null);
 setStreak(0);
 setMessage("Guess: will the next card be Higher or Lower?");
 }

 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div>
 <h1 className="font-display text-xl font-bold">🃏 Original777</h1>
 <p className="text-sm text-mist">Free play high-low • virtual coins</p>
 </div>
 </header>

 <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
 <div className="flex items-center justify-center gap-2">
 <span className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
 <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-mist"></span>
 </div>

 <div className="mt-6 flex items-center justify-center">
 <div className={`flex h-40 w-28 flex-col items-center justify-center rounded-2xl bg-white text-black shadow-lg ${revealing ? "animate-pulse" : ""}`}>
 <span className="text-3xl font-black">{(next || current).rank}</span>
 <span className="text-3xl">{(next || current).suit}</span>
 </div>
 </div>

 <p className="mt-4 text-center text-sm font-semibold text-yellow-200">{message}</p>

 <div className="mt-4 grid grid-cols-2 gap-3 text-center">
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Streak</p>
 <p className="text-sm font-bold text-ink">{streak}</p>
 </div>
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Best Streak</p>
 <p className="text-sm font-bold text-ink">{best}</p>
 </div>
 </div>

 <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />

 <div className="mt-5 grid grid-cols-2 gap-3">
 <button
 disabled={revealing}
 onClick={() => guess("lower")}
 className="rounded-full bg-white/10 py-4 font-bold disabled:opacity-60"
 >
 🔽 Lower
 </button>
 <button
 disabled={revealing}
 onClick={() => guess("higher")}
 className="rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60"
 >
 🔼 Higher
 </button>
 </div>
 <button onClick={resetGame} className="mt-2 w-full rounded-full bg-white/10 py-2 text-xs font-semibold text-mist">
 Reset Streak
 </button>

 <p className="mt-4 text-center text-[10px] leading-4 text-mist/70">
 Original777 is an entertainment-only mini-game. It does not use real money, does not
 debit or credit your wallet, and cannot be cashed out.
 </p>
 </section>
 </main>
 );
}
