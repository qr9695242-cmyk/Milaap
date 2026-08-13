// Room Entry Reward — same "sign in for 7 days" idea as lib/dailyReward.js
// (see components/DailyRewardModal.jsx for the visual reference), but the
// trigger here is "user just entered/joined a room" instead of "user
// opened the app". Its own Firestore doc (roomEntryRewardStatus/{uid}) so
// it never touches the app-open Daily Reward's streak.
//
//   day:       1-7, which slot the player is on right now
//   lastClaim: "YYYY-MM-DD" — last day this was claimed, UTC
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Coins-only, simpler than the app-open Daily Reward cycle (no
// frame/vehicle bonuses) — every room a user steps into for the first
// time that day can trigger this popup.
export const ROOM_ENTRY_REWARD_CYCLE = [
  { day: 1, coins: 1000 },
  { day: 2, coins: 1500 },
  { day: 3, coins: 2000 },
  { day: 4, coins: 2500 },
  { day: 5, coins: 3000 },
  { day: 6, coins: 4000 },
  { day: 7, coins: 8000, big: true },
];

/** One-shot read of this player's current day/lastClaim. */
export function listenRoomEntryRewardStatus(uid, callback) {
  getDoc(doc(db, "roomEntryRewardStatus", uid)).then((snap) => {
    callback(snap.exists() ? snap.data() : { day: 1, lastClaim: null });
  });
}

/** True if today's room-entry slot hasn't been claimed yet. */
export function isRoomEntryRewardAvailable(status) {
  return status?.lastClaim !== todayKey();
}

/**
 * Claims today's room-entry slot. Returns { alreadyClaimed: true } if
 * already done today, otherwise { alreadyClaimed: false, day, coinsAwarded }.
 */
export async function claimRoomEntryReward(uid) {
  const today = todayKey();
  const statusRef = doc(db, "roomEntryRewardStatus", uid);
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (tx) => {
    const statusSnap = await tx.get(statusRef);
    const status = statusSnap.exists() ? statusSnap.data() : { day: 1, lastClaim: null };

    if (status.lastClaim === today) {
      return { alreadyClaimed: true };
    }

    const yesterday = todayKey(new Date(Date.now() - 86400000));
    // Miss a day → restart the 7-day streak, same rule as Daily Reward.
    const nextDay = status.lastClaim === yesterday ? (status.day % 7) + 1 : 1;
    const slot = ROOM_ENTRY_REWARD_CYCLE[nextDay - 1];

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("Profile not found");
    const currentCoins = userSnap.data().coins || 0;

    tx.update(userRef, { coins: currentCoins + slot.coins });
    tx.set(statusRef, { day: nextDay, lastClaim: today, updatedAt: serverTimestamp() }, { merge: true });

    return { alreadyClaimed: false, day: nextDay, coinsAwarded: slot.coins };
  });
}
