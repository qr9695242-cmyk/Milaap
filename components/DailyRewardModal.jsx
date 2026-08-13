"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { findItem } from "@/lib/decorations";
import {
  DAILY_REWARD_CYCLE,
  listenDailyRewardStatus,
  isDailyRewardAvailable,
  claimDailyReward,
} from "@/lib/dailyReward";

/** Small preview tile for a bonus prize (frame/vehicle/chest), reused across the day cards. */
function BonusTile({ bonus }) {
  if (bonus.type === "chest") {
    return (
      <div className="flex flex-col items-center">
        <span className="text-3xl">🎁</span>
        <span className="mt-1 text-[10px] font-bold text-ink">{bonus.label}</span>
      </div>
    );
  }
  const item = findItem(bonus.type, bonus.itemId);
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-xl"
        style={{ background: item?.gradient || "rgba(255,255,255,0.08)" }}
      >
        {item?.emoji}
      </div>
      <span className="mt-1 text-[10px] font-bold text-ink">{bonus.label}</span>
    </div>
  );
}

function DayCard({ slot, currentDay, claimedToday }) {
  const isPast = slot.day < currentDay || (slot.day === currentDay && claimedToday);
  const isToday = slot.day === currentDay && !claimedToday;

  const base =
    "flex flex-col items-center justify-center gap-1 rounded-2xl p-3 ring-2 transition-all";
  const state = isToday
    ? "ring-diamond bg-diamond/10"
    : isPast
    ? "ring-transparent bg-panel2/60 opacity-60"
    : "ring-transparent bg-panel2/60";

  return (
    <div className={`${base} ${state} ${slot.big ? "col-span-2" : ""}`}>
      <span className="text-[10px] font-bold text-mist">Day {slot.day}</span>
      <div className={`flex items-center gap-4 ${slot.big ? "flex-row flex-wrap justify-center" : "flex-col"}`}>
        {slot.coins > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-2xl">🪙</span>
            <span className="mt-1 text-[11px] font-bold text-diamond">{slot.coins.toLocaleString()}</span>
          </div>
        )}
        {(slot.bonus || []).map((b, i) => (
          <BonusTile key={i} bonus={b} />
        ))}
      </div>
      {isPast && <span className="text-[9px] text-mist">✓ Claimed</span>}
    </div>
  );
}

export default function DailyRewardModal() {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { coinsAwarded, chestPrize } after claiming
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    listenDailyRewardStatus(user.uid, (s) => {
      setStatus(s);
      const available = isDailyRewardAvailable(s);
      setClaimedToday(!available);
      // Only auto-pop when there's actually something to claim — never
      // interrupt someone who already signed in today.
      if (available) setOpen(true);
    });
  }, [user]);

  if (!user || !status || !open) return null;

  const currentDay = status.day || 1;

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await claimDailyReward(user.uid);
      if (!res.alreadyClaimed) {
        setResult({ coinsAwarded: res.coinsAwarded, chestPrize: res.chestPrize, day: res.day });
        setClaimedToday(true);
      }
    } catch (e) {
      setError(e.message || "Kuch ghalat ho gaya, dobara koshish karein.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-void ring-1 ring-white/10">
        <div className="relative bg-glow-gradient px-5 pb-5 pt-6 text-center">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-ink"
          >
            ✕
          </button>
          <h2 className="font-display text-xl font-black text-ink">Daily Reward</h2>
          <p className="mt-1 text-xs text-ink/80">Sign in for 7 days for rich rewards</p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {(error) && <p className="mb-3 text-center text-xs text-neon-pink">{error}</p>}

          {result ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-4xl">🎉</span>
              <p className="font-display text-base font-extrabold text-ink">Day {result.day} claimed!</p>
              {result.coinsAwarded > 0 && (
                <p className="text-sm text-diamond">+{result.coinsAwarded.toLocaleString()} coins</p>
              )}
              {result.chestPrize && (
                <p className="text-sm text-gold">
                  Chest: +{result.chestPrize.coins ? `${result.chestPrize.coins} coins` : `${result.chestPrize.diamonds} diamonds`}
                </p>
              )}
              <button
                onClick={() => setOpen(false)}
                className="mt-3 w-full rounded-full bg-glow-gradient py-3 text-sm font-bold text-ink"
              >
                Nice!
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {DAILY_REWARD_CYCLE.filter((s) => !s.big).map((slot) => (
                  <DayCard key={slot.day} slot={slot} currentDay={currentDay} claimedToday={claimedToday} />
                ))}
              </div>
              <div className="mt-2 grid grid-cols-1">
                {DAILY_REWARD_CYCLE.filter((s) => s.big).map((slot) => (
                  <DayCard key={slot.day} slot={slot} currentDay={currentDay} claimedToday={claimedToday} />
                ))}
              </div>

              <button
                onClick={handleSignIn}
                disabled={busy || claimedToday}
                className="mt-4 w-full rounded-full bg-glow-gradient py-3 text-sm font-bold text-ink disabled:opacity-50"
              >
                {busy ? "…" : claimedToday ? "Already signed in today" : "Sign In"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
