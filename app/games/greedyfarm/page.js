"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// GreedyFarm — virtual-coin harvest game. wagering or cash-out.
// Tap ripe crops before they wither. Tapping an unripe crop costs points.

const CROPS = ["🍅", "🌽", "🥕", "🍆", "🥔"];
const ROUND_SECONDS = 30;
const PLOT_COUNT = 9;
const RIPEN_TICKS = 3; // ticks before a planted crop becomes ripe
const WITHER_TICKS = 7; // ticks before a ripe crop withers away
const TICK_MS = 400;

function emptyPlots() {
 return Array.from({ length: PLOT_COUNT }, () => null);
}

export default function GreedyFarmPage() {
 const { user, profile, loading } = useAuth();
 const [stake, setStake] = useState(0);
 const [sessionId, setSessionId] = useState(null);
 const [walletBusy, setWalletBusy] = useState(false);
 const [phase, setPhase] = useState("setup"); // setup | playing | finished
 const [plots, setPlots] = useState(emptyPlots());
 const [score, setScore] = useState(0);
 const [best, setBest] = useState(0);
 const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
 const intervalRef = useRef(null);
 const timerRef = useRef(null);

 useEffect(() => () => {
 clearInterval(intervalRef.current);
 clearInterval(timerRef.current);
 }, []);


 useEffect(() => {
 if (phase !== "finished" || !sessionId) return;
 const reward = scoreToReward(score, { entryCoins: stake, multiplier: 2 });
 settleGameSession({ sessionId, uid: user.uid, gameId: "greedyfarm", score: score, rewardCoins: reward, outcome: "finished" }).catch(() => {});
 }, [phase, sessionId]);

 if (loading || !user) {
 return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
 }

 async function startRound() {
 if (walletBusy) return;
 setWalletBusy(true);
 let sid;
 try { sid = await beginGameSession({ uid: user.uid, gameId: "greedyfarm", entryCoins: stake }); setSessionId(sid); }
 catch (e) { alert(e.message || "Unable to start game"); return; }
 finally { setWalletBusy(false); }
 setScore(0);
 setTimeLeft(ROUND_SECONDS);
 setPlots(emptyPlots());
 setPhase("playing");

 clearInterval(intervalRef.current);
 clearInterval(timerRef.current);

 intervalRef.current = setInterval(() => {
 setPlots((prev) =>
 prev.map((plot) => {
 if (!plot) {
 // Randomly plant a new seed in an empty plot
 return Math.random() < 0.28
 ? { emoji: CROPS[Math.floor(Math.random() * CROPS.length)], age: 0, ripe: false }
 : null;
 }
 const age = plot.age + 1;
 if (!plot.ripe && age >= RIPEN_TICKS) return { ...plot, age, ripe: true };
 if (plot.ripe && age >= RIPEN_TICKS + WITHER_TICKS) return null; // withered away
 return { ...plot, age };
 })
 );
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

 function tapPlot(i) {
 if (phase !== "playing") return;
 const plot = plots[i];
 if (!plot) return;
 if (plot.ripe) {
 setScore((s) => {
 const next = s + 10;
 setBest((b) => Math.max(b, next));
 return next;
 });
 } else {
 setScore((s) => Math.max(0, s - 5));
 }
 setPlots((prev) => prev.map((p, idx) => (idx === i ? null : p)));
 }

 if (phase === "setup") {
 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div>
 <h1 className="font-display text-xl font-bold">🌾 GreedyFarm</h1>
 <p className="text-sm text-mist">Skill harvest game • virtual coins</p>
 </div>
 </header>
 <section className="mx-4 rounded-3xl bg-panel p-5 text-center ring-1 ring-white/10">
 <div className="text-6xl">🌱🍅🌽</div>
 <h2 className="mt-3 text-lg font-bold">Harvest the ripe crops!</h2>
 <p className="mt-2 text-sm text-mist">
 Seeds sprout on the farm. Tap a crop only once it's fully grown (+10). Tapping too
 early costs points, and ripe crops wither if you wait too long.
 </p>
 <span className="mt-3 inline-block rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
 <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />
 <button onClick={startRound} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">
 ▶️ Start Round
 </button>
 <p className="mt-4 text-[10px] leading-4 text-mist/70">
 GreedyFarm is an entertainment-only mini-game. It uses Milaap . wagering or cash-out is added.
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
 <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
 <p className="text-center text-xs text-mist">Tap only the fully grown (bright) crops</p>
 <div className="mt-4 grid grid-cols-3 gap-3">
 {plots.map((plot, i) => (
 <button
 key={i}
 onClick={() => tapPlot(i)}
 className={`flex h-20 items-center justify-center rounded-xl text-4xl ring-1 ring-white/10 transition ${
 plot ? (plot.ripe ? "bg-emerald-500/30" : "bg-panel2 opacity-60") : "bg-panel2/40"
 }`}
 >
 {plot ? plot.emoji : "🟫"}
 </button>
 ))}
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
