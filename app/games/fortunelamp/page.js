"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// FortuneLamp — virtual-coin novelty game. No real-money wagering or cash-out.

const FORTUNES = [
  "A pleasant surprise is heading your way today.",
  "Someone is thinking of you right now.",
  "Your next conversation will bring good news.",
  "A small risk today leads to a big smile tomorrow.",
  "Good things come to those who stay patient.",
  "Your creativity is about to be noticed.",
  "An old friend will reach out soon.",
  "Today is a great day to try something new.",
  "Your hard work is closer to paying off than you think.",
  "Kindness you show today will circle back to you.",
  "A fresh opportunity is closer than it appears.",
  "Your energy today will lift someone else's mood.",
];

export default function FortuneLampPage() {
  const { user, profile, loading } = useAuth();
  const [stake, setStake] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [rubbing, setRubbing] = useState(false);
  const [fortune, setFortune] = useState(null);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!sessionId) return;
    const scoreValue = fortune ? 50 : 0;
    const reward = scoreToReward(scoreValue, { entryCoins: stake, multiplier: 1 });
    // Action games settle after their visible result is produced.
    if ((fortune != null)) { settleGameSession({ sessionId, uid: user.uid, gameId: "fortune", score: scoreValue, rewardCoins: reward, outcome: "finished" }).catch(() => {}); setSessionId(null); }
  }, [count, sessionId]);

  if (loading || !user) {
    return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function rubLamp() {
    if (walletBusy) return;
    setWalletBusy(true);
    let sid;
    try { sid = await beginGameSession({ uid: user.uid, gameId: "fortune", entryCoins: stake }); setSessionId(sid); }
    catch (e) { alert(e.message || "Unable to start game"); return; }
    finally { setWalletBusy(false); }

    if (rubbing) return;
    setRubbing(true);
    setFortune(null);
    setTimeout(() => {
      const pick = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      setFortune(pick);
      setCount((c) => c + 1);
      setHistory((h) => [pick, ...h].slice(0, 5));
      setRubbing(false);
    }, 1400);
  }

  return (
    <main className="game-screen min-h-screen bg-void text-ink pb-10">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/games" className="text-2xl text-mist">‹</Link>
        <div>
          <h1 className="font-display text-xl font-bold">🪔 FortuneLamp</h1>
          <p className="text-sm text-mist">Free play fortune reveal • virtual coins</p>
        </div>
      </header>

      <section className="mx-4 rounded-3xl bg-panel p-5 text-center ring-1 ring-white/10">
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-mist">No real money</span>
        </div>

        <div className={`mx-auto mt-8 text-8xl ${rubbing ? "animate-bounce" : ""}`}>
          🪔
        </div>
        {rubbing && <p className="mt-3 text-sm text-mist">✨ Rubbing the lamp…</p>}

        {fortune && !rubbing && (
          <div className="mt-6 rounded-2xl bg-panel2 p-4 ring-1 ring-white/10">
            <p className="text-2xl">🧞</p>
            <p className="mt-2 text-base font-semibold text-yellow-200">{fortune}</p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-mist">Rubs</p>
            <p className="text-sm font-bold text-ink">{count}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-mist">Latest</p>
            <p className="truncate text-sm font-bold text-ink">{fortune ? "✨ Revealed" : "—"}</p>
          </div>
        </div>

        {history.length > 1 && (
          <div className="mt-4 text-left">
            <p className="text-[10px] text-mist">Recent fortunes</p>
            <ul className="mt-1 space-y-1">
              {history.slice(1).map((f, i) => (
                <li key={i} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-mist">{f}</li>
              ))}
            </ul>
          </div>
        )}

        <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />

        <button
          disabled={rubbing}
          onClick={rubLamp}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60"
        >
          {rubbing ? "Rubbing…" : "🪔 Rub the Lamp"}
        </button>

        <p className="mt-4 text-center text-[10px] leading-4 text-mist/70">
          FortuneLamp is an entertainment-only mini-game. It does not use real money, does not
          debit or credit your wallet, and cannot be cashed out.
        </p>
      </section>
    </main>
  );
}
