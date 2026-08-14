"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// Lucky777 — virtual-coin arcade reel game. wagering or cash-out.

const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
// Weighted so the top symbol (7️⃣) is rarest — purely for feel, not payout.
const WEIGHTS = [30, 24, 18, 14, 9, 5];

function weightedSymbol() {
 const total = WEIGHTS.reduce((a, b) => a + b, 0);
 let r = Math.random() * total;
 for (let i = 0; i < SYMBOLS.length; i++) {
 r -= WEIGHTS[i];
 if (r <= 0) return SYMBOLS[i];
 }
 return SYMBOLS[0];
}

function spinReels() {
 return [weightedSymbol(), weightedSymbol(), weightedSymbol()];
}

function resultLabel(reels) {
 if (reels[0] === reels[1] && reels[1] === reels[2]) {
 return reels[0] === "7️⃣" ? { text: "🎉 MEGA JACKPOT!", points: 500 } : { text: "🎊 Triple Match!", points: 150 };
 }
 if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
 return { text: "✨ Nice Combo", points: 30 };
 }
 return { text: "Spin again", points: 5 };
}

export default function Lucky777Page() {
 const { user, profile, loading } = useAuth();
 const [stake, setStake] = useState(0);
 const [sessionId, setSessionId] = useState(null);
 const [walletBusy, setWalletBusy] = useState(false);
 const [reels, setReels] = useState(["7️⃣", "💎", "⭐"]);
 const [spinning, setSpinning] = useState(false);
 const [message, setMessage] = useState("Free Play • Tap Spin to start");
 const [score, setScore] = useState(0);
 const [best, setBest] = useState(0);
 const [spinCount, setSpinCount] = useState(0);
 const timerRef = useRef(null);

 useEffect(() => () => clearInterval(timerRef.current), []);

 useEffect(() => {
 if (!sessionId) return;
 const scoreValue = Number(score) || 0;
 const reward = scoreToReward(scoreValue, { entryCoins: stake, multiplier: 1 });
 // Action games settle after their visible result is produced.
 if ((message !== "Spinning…")) { settleGameSession({ sessionId, uid: user.uid, gameId: "slot", score: scoreValue, rewardCoins: reward, outcome: "finished" }).catch(() => {}); setSessionId(null); }
 }, [spinCount, sessionId]);

 if (loading || !user) {
 return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
 }

 async function spin() {
 if (walletBusy) return;
 setWalletBusy(true);
 let sid;
 try { sid = await beginGameSession({ uid: user.uid, gameId: "slot", entryCoins: stake }); setSessionId(sid); }
 catch (e) { alert(e.message || "Unable to start game"); return; }
 finally { setWalletBusy(false); }

 if (spinning) return;
 setSpinning(true);
 setMessage("Spinning…");
 let ticks = 0;
 timerRef.current = setInterval(() => {
 setReels(spinReels());
 ticks += 1;
 if (ticks >= 10) {
 clearInterval(timerRef.current);
 const finalReels = spinReels();
 setReels(finalReels);
 const result = resultLabel(finalReels);
 setMessage(result.text);
 setScore((s) => {
 const next = s + result.points;
 setBest((b) => Math.max(b, next));
 return next;
 });
 setSpinCount((c) => c + 1);
 setSpinning(false);
 }
 }, 80);
 }

 function resetScore() {
 setScore(0);
 setMessage("Free Play • Tap Spin to start");
 }

 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div>
 <h1 className="font-display text-xl font-bold">🎰 Lucky777</h1>
 <p className="text-sm text-mist">Free play arcade • virtual coins</p>
 </div>
 </header>

 <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
 <div className="flex items-center justify-center gap-2">
 <span className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
 <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-mist"></span>
 </div>

 <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl bg-panel2 p-6">
 {reels.map((s, i) => (
 <div key={i} className={`flex h-24 w-20 items-center justify-center rounded-xl bg-void text-5xl ring-1 ring-white/10 ${spinning ? "animate-pulse" : ""}`}>
 {s}
 </div>
 ))}
 </div>

 <p className="mt-4 text-center text-base font-bold text-yellow-200">{message}</p>

 <div className="mt-4 grid grid-cols-3 gap-2 text-center">
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Score</p>
 <p className="text-sm font-bold text-ink">{score}</p>
 </div>
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Best</p>
 <p className="text-sm font-bold text-ink">{best}</p>
 </div>
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Spins</p>
 <p className="text-sm font-bold text-ink">{spinCount}</p>
 </div>
 </div>

 <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />

 <button
 disabled={spinning}
 onClick={spin}
 className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60"
 >
 {spinning ? "Spinning…" : "🎰 Spin"}
 </button>
 <button onClick={resetScore} className="mt-2 w-full rounded-full bg-white/10 py-2 text-xs font-semibold text-mist">
 Reset Score
 </button>

 <p className="mt-4 text-center text-[10px] leading-4 text-mist/70">
 Lucky777 is an entertainment-only mini-game. It does not use real money, does not
 debit or credit your wallet, and cannot be cashed out.
 </p>
 </section>
 </main>
 );
}
