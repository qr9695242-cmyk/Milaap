"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// GreedyBaby — virtual-coin catch game. wagering or cash-out.
// Move the basket to catch good items and dodge bad ones before time runs out.

const GOOD_ITEMS = ["🍎", "🍌", "🍇", "🍕", "🍰"];
const BAD_ITEMS = ["💣", "🦴"];
const ROUND_SECONDS = 30;
const LANES = 5;
const BASKET_LANE_DEFAULT = 2;
const TICK_MS = 400;

export default function GreedyBabyPage() {
 const { user, profile, loading } = useAuth();
 const [stake, setStake] = useState(0);
 const [sessionId, setSessionId] = useState(null);
 const [walletBusy, setWalletBusy] = useState(false);
 const [phase, setPhase] = useState("setup"); // setup | playing | finished
 const [basketLane, setBasketLane] = useState(BASKET_LANE_DEFAULT);
 const [items, setItems] = useState([]); // {id, lane, row, kind}
 const [score, setScore] = useState(0);
 const [best, setBest] = useState(0);
 const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
 const idRef = useRef(0);
 const intervalRef = useRef(null);
 const timerRef = useRef(null);

 useEffect(() => () => {
 clearInterval(intervalRef.current);
 clearInterval(timerRef.current);
 }, []);


 useEffect(() => {
 if (phase !== "finished" || !sessionId) return;
 const reward = scoreToReward(score, { entryCoins: stake, multiplier: 2 });
 settleGameSession({ sessionId, uid: user.uid, gameId: "greedybaby", score: score, rewardCoins: reward, outcome: "finished" }).catch(() => {});
 }, [phase, sessionId]);

 if (loading || !user) {
 return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
 }

 async function startRound() {
 if (walletBusy) return;
 setWalletBusy(true);
 let sid;
 try { sid = await beginGameSession({ uid: user.uid, gameId: "greedybaby", entryCoins: stake }); setSessionId(sid); }
 catch (e) { alert(e.message || "Unable to start game"); return; }
 finally { setWalletBusy(false); }
 setScore(0);
 setTimeLeft(ROUND_SECONDS);
 setBasketLane(BASKET_LANE_DEFAULT);
 setItems([]);
 setPhase("playing");

 clearInterval(intervalRef.current);
 clearInterval(timerRef.current);

 intervalRef.current = setInterval(() => {
 setItems((prev) => {
 // Move items down, drop caught/missed ones, occasionally spawn new
 const moved = prev
 .map((it) => ({ ...it, row: it.row + 1 }))
 .filter((it) => {
 if (it.row >= 6) {
 if (it.lane === basketLaneRef.current && it.kind === "good") {
 scoreRef.current += 10;
 } else if (it.lane === basketLaneRef.current && it.kind === "bad") {
 scoreRef.current = Math.max(0, scoreRef.current - 15);
 }
 return false;
 }
 return true;
 });
 setScore(scoreRef.current);
 setBest((b) => Math.max(b, scoreRef.current));

 if (Math.random() < 0.55) {
 const isBad = Math.random() < 0.25;
 moved.push({
 id: idRef.current++,
 lane: Math.floor(Math.random() * LANES),
 row: 0,
 kind: isBad ? "bad" : "good",
 emoji: isBad ? BAD_ITEMS[Math.floor(Math.random() * BAD_ITEMS.length)] : GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)],
 });
 }
 return moved;
 });
 }, TICK_MS);

 timerRef.current = setInterval(() => {
 setTimeLeft((t) => {
 if (t <= 1) {
 clearInterval(intervalRef.current);
 clearInterval(timerRef.current);
 setPhase("finished");
 return 0;
 }
 return t - 1;
 });
 }, 1000);
 }

 // Refs to read latest values inside the interval closure without resetting it.
 const basketLaneRef = useRef(basketLane);
 const scoreRef = useRef(score);
 useEffect(() => { basketLaneRef.current = basketLane; }, [basketLane]);
 useEffect(() => { scoreRef.current = score; }, [score]);

 function moveLeft() { setBasketLane((l) => Math.max(0, l - 1)); }
 function moveRight() { setBasketLane((l) => Math.min(LANES - 1, l + 1)); }

 if (phase === "setup") {
 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div>
 <h1 className="font-display text-xl font-bold">🍼 GreedyBaby</h1>
 <p className="text-sm text-mist">Skill catch game • virtual coins</p>
 </div>
 </header>
 <section className="mx-4 rounded-3xl bg-panel p-5 text-center ring-1 ring-white/10">
 <div className="text-6xl">🍼🍎🍕</div>
 <h2 className="mt-3 text-lg font-bold">Catch the good stuff!</h2>
 <p className="mt-2 text-sm text-mist">
 Move the basket left/right to catch falling food (+10) and dodge bombs and bones
 (-15). 30 second rounds.
 </p>
 <span className="mt-3 inline-block rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
 <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />
 <button onClick={startRound} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">
 ▶️ Start Round
 </button>
 <p className="mt-4 text-[10px] leading-4 text-mist/70">
 GreedyBaby is an entertainment-only mini-game. It uses Milaap . wagering or cash-out is added.
 </p>
 </section>
 </main>
 );
 }

 if (phase === "playing") {
 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center justify-between px-4 pt-6 pb-3">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <p className="text-sm font-semibold">⏱ {timeLeft}s</p>
 <span className="text-xs text-mist">Score {score}</span>
 </header>
 <section className="mx-4 rounded-3xl bg-panel p-4 ring-1 ring-white/10">
 <div className="relative h-72 overflow-hidden rounded-2xl bg-panel2">
 {items.map((it) => (
 <div
 key={it.id}
 className="absolute text-3xl transition-all"
 style={{
 left: `${(it.lane / LANES) * 100 + 100 / LANES / 2}%`,
 top: `${(it.row / 6) * 100}%`,
 transform: "translate(-50%, -50%)",
 }}
 >
 {it.emoji}
 </div>
 ))}
 <div
 className="absolute bottom-2 text-4xl transition-all"
 style={{ left: `${(basketLane / LANES) * 100 + 100 / LANES / 2}%`, transform: "translateX(-50%)" }}
 >
 🧺
 </div>
 </div>
 <div className="mt-4 grid grid-cols-2 gap-3">
 <button onClick={moveLeft} className="rounded-xl bg-white/10 py-4 text-xl font-bold">◀️</button>
 <button onClick={moveRight} className="rounded-xl bg-white/10 py-4 text-xl font-bold">▶️</button>
 </div>
 </section>
 </main>
 );
 }

 return (
 <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5">
 <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
 <div className="text-6xl">🏆</div>
 <h1 className="mt-4 text-2xl font-bold">Round Over!</h1>
 <p className="mt-2 text-sm text-mist">Score: {score} • Best: {best}</p>
 <button onClick={startRound} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">
 Play Again
 </button>
 <Link href="/games" className="mt-3 block w-full rounded-full bg-white/10 py-3 text-sm font-semibold">
 Back to Games
 </Link>
 </div>
 </main>
 );
}
