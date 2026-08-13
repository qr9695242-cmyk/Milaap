"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// CrazyFruit — virtual-coin reaction game. No real-money wagering or cash-out.
// Tap every tile that matches the target fruit before the 30s timer runs out.

const FRUITS = ["🍒", "🍋", "🍇", "🍉", "🍓", "🥝"];
const ROUND_SECONDS = 30;
const GRID_SIZE = 12;

function randomGrid() {
  return Array.from({ length: GRID_SIZE }, () => FRUITS[Math.floor(Math.random() * FRUITS.length)]);
}

function randomTarget(grid) {
  return grid[Math.floor(Math.random() * grid.length)];
}

export default function CrazyFruitPage() {
  const { user, profile, loading } = useAuth();
  const [stake, setStake] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [phase, setPhase] = useState("setup"); // setup | playing | finished
  const [grid, setGrid] = useState(randomGrid());
  const [target, setTarget] = useState(FRUITS[0]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [flash, setFlash] = useState(null); // {i, ok}
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);


  useEffect(() => {
    if (phase !== "finished" || !sessionId) return;
    const reward = scoreToReward(score, { entryCoins: stake, multiplier: 2 });
    settleGameSession({ sessionId, uid: user.uid, gameId: "crazyfruit", score: score, rewardCoins: reward, outcome: "finished" }).catch(() => {});
  }, [phase, sessionId]);

  if (loading || !user) {
    return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startRound() {
    if (walletBusy) return;
    setWalletBusy(true);
    let sid;
    try { sid = await beginGameSession({ uid: user.uid, gameId: "crazyfruit", entryCoins: stake }); setSessionId(sid); }
    catch (e) { alert(e.message || "Unable to start game"); return; }
    finally { setWalletBusy(false); }
    const g = randomGrid();
    setGrid(g);
    setTarget(randomTarget(g));
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setPhase("playing");
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setPhase("finished");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function tapTile(i) {
    if (phase !== "playing") return;
    const hit = grid[i] === target;
    setFlash({ i, ok: hit });
    setTimeout(() => setFlash(null), 150);
    setScore((s) => {
      const next = Math.max(0, s + (hit ? 10 : -5));
      setBest((b) => Math.max(b, next));
      return next;
    });
    const newGrid = [...grid];
    newGrid[i] = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    setGrid(newGrid);
    if (hit && Math.random() < 0.3) setTarget(randomTarget(newGrid));
  }

  if (phase === "setup") {
    return (
      <main className="game-screen min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🍓 CrazyFruit</h1>
            <p className="text-sm text-mist">Skill reaction game • virtual coins</p>
          </div>
        </header>
        <section className="mx-4 rounded-3xl bg-panel p-5 text-center ring-1 ring-white/10">
          <div className="text-6xl">🍉🍒🍇</div>
          <h2 className="mt-3 text-lg font-bold">Tap the matching fruit!</h2>
          <p className="mt-2 text-sm text-mist">
            A target fruit shows at the top. Tap every tile below that matches it before the 30s
            timer runs out. Wrong taps cost points.
          </p>
          <span className="mt-3 inline-block rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
          <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />
          <button onClick={startRound} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">
            ▶️ Start Round
          </button>
          <p className="mt-4 text-[10px] leading-4 text-mist/70">
            CrazyFruit is an entertainment-only mini-game. It uses Milaap virtual coins only. No real-money wagering or cash-out is added.
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
          <p className="text-center text-xs text-mist">Tap matching:</p>
          <p className="mt-1 text-center text-4xl">{target}</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {grid.map((f, i) => (
              <button
                key={i}
                onClick={() => tapTile(i)}
                className={`flex h-16 items-center justify-center rounded-xl text-3xl ring-1 ring-white/10 transition ${
                  flash?.i === i ? (flash.ok ? "bg-emerald-400/40" : "bg-red-500/40") : "bg-panel2"
                }`}
              >
                {f}
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
