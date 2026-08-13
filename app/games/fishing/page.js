"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// Fishing — virtual-coin catch game. No real-money wagering or cash-out.
// Fish swim across the pond; tap them before they swim off-screen.

const FISH_TYPES = [
  { emoji: "🐟", points: 10, speed: 2200 },
  { emoji: "🐠", points: 15, speed: 1800 },
  { emoji: "🐡", points: 5, speed: 2800 },
  { emoji: "🦈", points: -20, speed: 1400 }, // avoid the shark!
];
const ROUND_SECONDS = 30;
const SPAWN_MS = 700;

export default function FishingPage() {
  const { user, profile, loading } = useAuth();
  const [stake, setStake] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [phase, setPhase] = useState("setup"); // setup | playing | finished
  const [fish, setFish] = useState([]); // {id, type, top, caught}
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const idRef = useRef(0);
  const spawnRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => {
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
  }, []);


  useEffect(() => {
    if (phase !== "finished" || !sessionId) return;
    const reward = scoreToReward(score, { entryCoins: stake, multiplier: 2 });
    settleGameSession({ sessionId, uid: user.uid, gameId: "fishing", score: score, rewardCoins: reward, outcome: "finished" }).catch(() => {});
  }, [phase, sessionId]);

  if (loading || !user) {
    return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startRound() {
    if (walletBusy) return;
    setWalletBusy(true);
    let sid;
    try { sid = await beginGameSession({ uid: user.uid, gameId: "fishing", entryCoins: stake }); setSessionId(sid); }
    catch (e) { alert(e.message || "Unable to start game"); return; }
    finally { setWalletBusy(false); }
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setFish([]);
    setPhase("playing");

    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);

    spawnRef.current = setInterval(() => {
      const type = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
      const id = idRef.current++;
      const top = 10 + Math.random() * 75; // percent
      const fromLeft = Math.random() < 0.5;
      setFish((prev) => [...prev, { id, type, top, fromLeft, caught: false }]);
      setTimeout(() => {
        setFish((prev) => prev.filter((f) => f.id !== id));
      }, type.speed);
    }, SPAWN_MS);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(spawnRef.current);
          clearInterval(timerRef.current);
          setPhase("finished");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function catchFish(id) {
    setFish((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target || target.caught) return prev;
      setScore((s) => {
        const next = Math.max(0, s + target.type.points);
        setBest((b) => Math.max(b, next));
        return next;
      });
      return prev.filter((f) => f.id !== id);
    });
  }

  if (phase === "setup") {
    return (
      <main className="game-screen min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🎣 Fishing</h1>
            <p className="text-sm text-mist">Skill catch game • virtual coins</p>
          </div>
        </header>
        <section className="mx-4 rounded-3xl bg-panel p-5 text-center ring-1 ring-white/10">
          <div className="text-6xl">🐟🐠🦈</div>
          <h2 className="mt-3 text-lg font-bold">Tap the fish before they swim away!</h2>
          <p className="mt-2 text-sm text-mist">
            🐟 +10 · 🐠 +15 · 🐡 +5 — but watch out for 🦈 sharks (-20). 30 second rounds.
          </p>
          <span className="mt-3 inline-block rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
          <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />
          <button onClick={startRound} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">
            ▶️ Start Round
          </button>
          <p className="mt-4 text-[10px] leading-4 text-mist/70">
            Fishing is an entertainment-only mini-game. It uses Milaap virtual coins only. No real-money wagering or cash-out is added.
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
          <div className="relative h-80 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-900/60 to-blue-950">
            {fish.map((f) => (
              <button
                key={f.id}
                onClick={() => catchFish(f.id)}
                className="absolute text-4xl"
                style={{
                  top: `${f.top}%`,
                  left: f.fromLeft ? "-10%" : undefined,
                  right: !f.fromLeft ? "-10%" : undefined,
                  animation: `fishSwim-${f.id} ${f.type.speed}ms linear forwards`,
                }}
              >
                <span style={{ display: "inline-block", transform: f.fromLeft ? "scaleX(1)" : "scaleX(-1)" }}>
                  {f.type.emoji}
                </span>
                <style jsx>{`
                  @keyframes fishSwim-${f.id} {
                    from { transform: translateX(0); }
                    to { transform: translateX(${f.fromLeft ? "110vw" : "-110vw"}); }
                  }
                `}</style>
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
