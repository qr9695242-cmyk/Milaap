"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
 ROOM_ENTRY_REWARD_CYCLE,
 listenRoomEntryRewardStatus,
 isRoomEntryRewardAvailable,
 claimRoomEntryReward,
} from "@/lib/roomEntryReward";

function DayCard({ slot, currentDay, claimedToday }) {
 const isPast = slot.day < currentDay || (slot.day === currentDay && claimedToday);
 const isToday = slot.day === currentDay && !claimedToday;

 const base = "flex flex-col items-center justify-center gap-1 rounded-2xl p-3 ring-2 transition-all";
 const state = isToday
 ? "ring-diamond bg-diamond/10"
 : isPast
 ? "ring-transparent bg-panel2/60 opacity-60"
 : "ring-transparent bg-panel2/60";

 return (
 <div className={`${base} ${state} ${slot.big ? "col-span-2" : ""}`}>
 <span className="text-[10px] font-bold text-mist">Day {slot.day}</span>
 <div className="flex flex-col items-center">
 <span className="text-2xl">🪙</span>
 <span className="mt-1 text-[11px] font-bold text-diamond">{slot.coins.toLocaleString()}</span>
 </div>
 {isPast && <span className="text-[9px] text-mist">✓ Claimed</span>}
 </div>
 );
}

/**
 * Pops up the first time a user enters ANY room on a given day — a coins
 * reward for showing up in a room, separate from the app-open Daily
 * Reward. Just drop <RoomEntryRewardModal /> into a room page; it handles
 * its own visibility.
 */
export default function RoomEntryRewardModal() {
 const { user } = useAuth();
 const [status, setStatus] = useState(null);
 const [open, setOpen] = useState(false);
 const [claimedToday, setClaimedToday] = useState(false);
 const [busy, setBusy] = useState(false);
 const [result, setResult] = useState(null);
 const [error, setError] = useState(null);

 useEffect(() => {
 if (!user) return;
 listenRoomEntryRewardStatus(user.uid, (s) => {
 setStatus(s);
 const available = isRoomEntryRewardAvailable(s);
 setClaimedToday(!available);
 if (available) setOpen(true);
 });
 }, [user]);

 if (!user || !status || !open) return null;

 const currentDay = status.day || 1;

 async function handleClaim() {
 setBusy(true);
 setError(null);
 try {
 const res = await claimRoomEntryReward(user.uid);
 if (!res.alreadyClaimed) {
 setResult({ coinsAwarded: res.coinsAwarded, day: res.day });
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
 <h2 className="font-display text-xl font-black text-ink">Room Entry Reward</h2>
 <p className="mt-1 text-xs text-ink/80">Enter a room for 7 days for rich rewards</p>
 </div>

 <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
 {error && <p className="mb-3 text-center text-xs text-neon-pink">{error}</p>}

 {result ? (
 <div className="flex flex-col items-center gap-2 py-4">
 <span className="text-4xl">🎉</span>
 <p className="font-display text-base font-extrabold text-ink">Day {result.day} claimed!</p>
 <p className="text-sm text-diamond">+{result.coinsAwarded.toLocaleString()} coins</p>
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
 {ROOM_ENTRY_REWARD_CYCLE.filter((s) => !s.big).map((slot) => (
 <DayCard key={slot.day} slot={slot} currentDay={currentDay} claimedToday={claimedToday} />
 ))}
 </div>
 <div className="mt-2 grid grid-cols-1">
 {ROOM_ENTRY_REWARD_CYCLE.filter((s) => s.big).map((slot) => (
 <DayCard key={slot.day} slot={slot} currentDay={currentDay} claimedToday={claimedToday} />
 ))}
 </div>

 <button
 onClick={handleClaim}
 disabled={busy || claimedToday}
 className="mt-4 w-full rounded-full bg-glow-gradient py-3 text-sm font-bold text-ink disabled:opacity-50"
 >
 {busy ? "…" : claimedToday ? "Already claimed today" : "Claim"}
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
