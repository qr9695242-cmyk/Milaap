"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
  CHECKIN_REWARDS,
  LUCKY_BOX_COST,
  SPIN_WHEEL_COST,
  listenRewardStatus,
  claimDailyCheckin,
  openLuckyBox,
  spinWheel,
} from "@/lib/rewards";
import BottomNav from "@/components/BottomNav";

export default function RewardsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("checkin"); // checkin | box | spin
  const [status, setStatus] = useState({ streak: 0, lastCheckin: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) listenRewardStatus(user.uid, setStatus);
  }, [user]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const claimedToday = status.lastCheckin === todayKey;

  async function handleCheckin() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await claimDailyCheckin(user.uid);
      if (result.alreadyClaimed) {
        setMessage("Already claimed today — come back tomorrow!");
      } else {
        setMessage(`+${result.coinsAwarded} coins! Streak: Day ${result.streak}`);
        setStatus((s) => ({ ...s, lastCheckin: todayKey, streak: result.streak }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePlay(gameFn, cost) {
    if ((profile?.coins ?? 0) < cost) {
      setError(`Need at least ${cost} coins`);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const prize = await gameFn(user.uid);
      setMessage(`You won: ${prize.label} 🎉`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="font-display text-xl font-extrabold text-ink">Rewards</h1>
        <span className="rounded-full bg-panel px-3 py-1.5 text-xs text-diamond ring-1 ring-white/5">
          ● {profile?.coins ?? 0}
        </span>
      </header>

      <div className="mx-5 mt-4 flex gap-2">
        <TabButton active={tab === "checkin"} onClick={() => setTab("checkin")}>Check-in</TabButton>
        <TabButton active={tab === "box"} onClick={() => setTab("box")}>Lucky Box</TabButton>
        <TabButton active={tab === "spin"} onClick={() => setTab("spin")}>Spin Wheel</TabButton>
      </div>

      {(message || error) && (
        <div
          className={`mx-5 mt-4 rounded-xl p-3 text-center text-sm font-semibold ${
            error ? "bg-neon-pink/10 text-neon-pink" : "bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {error || message}
        </div>
      )}

      {tab === "checkin" && (
        <section className="mx-5 mt-4">
          <p className="text-xs text-mist">
            Check in every day for a bigger reward. Miss a day and the streak resets.
          </p>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {CHECKIN_REWARDS.map((coins, i) => {
              const dayNum = i + 1;
              const currentDay = ((status.streak - 1) % 7) + 1;
              const isDone = claimedToday && dayNum <= currentDay;
              return (
                <div
                  key={i}
                  className={`rounded-xl p-2 text-center ring-1 ${
                    isDone ? "bg-gold/20 ring-gold/40" : "bg-panel ring-white/5"
                  }`}
                >
                  <p className="text-[10px] text-mist">Day {dayNum}</p>
                  <p className="mt-1 text-xs font-bold text-ink">●{coins}</p>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleCheckin}
            disabled={busy || claimedToday}
            className="mt-5 w-full rounded-full bg-glow-gradient py-3 text-sm font-bold text-ink disabled:opacity-50"
          >
            {claimedToday ? "Claimed for today" : "Claim Today's Reward"}
          </button>
          <p className="mt-2 text-center text-xs text-mist">Current streak: {status.streak || 0} day(s)</p>
        </section>
      )}

      {tab === "box" && (
        <section className="mx-5 mt-4 text-center">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl bg-glow-gradient text-6xl shadow-glow">
            🎁
          </div>
          <p className="mt-4 text-xs text-mist">
            Open a box for a random prize — coins, diamonds, or the jackpot.
          </p>
          <button
            onClick={() => handlePlay(openLuckyBox, LUCKY_BOX_COST)}
            disabled={busy}
            className="mt-5 w-full rounded-full bg-glow-gradient py-3 text-sm font-bold text-ink disabled:opacity-50"
          >
            Open Box — ● {LUCKY_BOX_COST} coins
          </button>
        </section>
      )}

      {tab === "spin" && (
        <section className="mx-5 mt-4 text-center">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-glow-gradient text-6xl shadow-glow">
            🎡
          </div>
          <p className="mt-4 text-xs text-mist">
            Spin the wheel for a random prize — cheaper than the Lucky Box, smaller odds of a jackpot.
          </p>
          <button
            onClick={() => handlePlay(spinWheel, SPIN_WHEEL_COST)}
            disabled={busy}
            className="mt-5 w-full rounded-full bg-glow-gradient py-3 text-sm font-bold text-ink disabled:opacity-50"
          >
            Spin — ● {SPIN_WHEEL_COST} coins
          </button>
        </section>
      )}

      <BottomNav />
    </main>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-xs font-semibold ${
        active ? "bg-glow-gradient text-ink" : "bg-panel text-mist ring-1 ring-white/10"
      }`}
    >
      {children}
    </button>
  );
}
