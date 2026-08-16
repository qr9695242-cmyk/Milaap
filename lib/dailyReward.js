// Daily Reward — 7-day sign-in popup (see components/DailyRewardModal.jsx).
// This is separate from the Check-in tab on the Rewards page (lib/rewards.js
// CHECKIN_REWARDS) — that one is a simple coins-only streak you opt into on
// the Rewards page; this one is the auto-popup with mixed prizes (coins +
// frames/vehicles) that greets the player once a day, matching the app's
// "Daily Reward" card. Two systems, two Firestore docs, so claiming one
// never touches the other's streak.
//
// User doc fields used: none directly — all state lives in its own
// dailyRewardStatus/{uid} doc (see firestore.rules), same pattern as
// rewardStatus/{uid} in lib/rewards.js.
// day: 1-7, which slot the player is on right now (resets to 1
// after day 7 is claimed, or after a missed day)
// lastClaim: "YYYY-MM-DD" — last day this was claimed, UTC

import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { grantTemporaryDecoration } from "./decorations";

function todayKey(d = new Date()) {
 return d.toISOString().slice(0, 10);
}

// Each day's prize. `coins` is credited directly. `bonus` (optional) is one
// or more extra prizes shown as separate tiles, same as the reference app's
// Day 3/5/6/7 cards. Frame/vehicle bonuses use existing catalog ids from
// lib/decorations.js (FRAME_CATALOG / VEHICLE_CATALOG) so they render with
// real art/gradients everywhere the app already knows how to show them —
// no new asset work needed. "chest" bonuses roll a small random coin/diamond
// prize when opened (see MYSTERY_CHEST_PRIZES below), the same pattern used
// for Lucky Box / Spin Wheel in lib/rewards.js.
export const DAILY_REWARD_CYCLE = [
 { day: 1, coins: 6000 },
 { day: 2, coins: 6000 },
 { day: 3, coins: 0, bonus: [{ type: "frame", itemId: "frame_silver", days: 1, label: "Frame · 1 Day" }] },
 { day: 4, coins: 12000 },
 { day: 5, coins: 0, bonus: [{ type: "vehicle", itemId: "veh_bike", days: 1, label: "Ride · 1 Day" }] },
 {
 day: 6,
 coins: 12000,
 bonus: [{ type: "frame", itemId: "frame_ocean", days: 3, label: "Frame · 3 Days" }],
 },
 {
 day: 7,
 big: true,
 coins: 18000,
 bonus: [
 { type: "frame", itemId: "frame_phoenix", days: 3, label: "Frame · 3 Days" },
 { type: "vehicle", itemId: "veh_sports", days: 3, label: "Ride · 3 Days" },
 { type: "chest", label: "Mystery Chest" },
 ],
 },
];

const MYSTERY_CHEST_PRIZES = [
 { label: "500 coins", coins: 500, weight: 40 },
 { label: "1500 coins", coins: 1500, weight: 30 },
 { label: "5000 coins", coins: 5000, weight: 20 },
 { label: "50 diamonds JACKPOT", diamonds: 50, weight: 10 },
];

function pickWeighted(prizes) {
 const total = prizes.reduce((s, p) => s + p.weight, 0);
 let r = Math.random() * total;
 for (const p of prizes) {
 r -= p.weight;
 if (r <= 0) return p;
 }
 return prizes[prizes.length - 1];
}

/** One-shot read of this player's current day/lastClaim (matches lib/rewards.js's listenRewardStatus style). */
export function listenDailyRewardStatus(uid, callback) {
 getDoc(doc(db, "dailyRewardStatus", uid)).then((snap) => {
 callback(snap.exists() ? snap.data() : { day: 1, lastClaim: null });
 });
}

/** True if today's slot hasn't been claimed yet — use this to decide whether to show the popup. */
export function isDailyRewardAvailable(status) {
 return status?.lastClaim !== todayKey();
}

/**
 * Claims today's slot. Returns { alreadyClaimed: true } if already done
 * today, otherwise { alreadyClaimed: false, day, coinsAwarded, chestPrize? }.
 * Coins (and the streak position itself) are credited inside one
 * transaction; frame/vehicle bonuses are granted right after via
 * grantTemporaryDecoration (each of those is its own small transaction on
 * the same user doc — safe to run sequentially, just not atomic with the
 * coins credit, same tradeoff lib/wallet.js already makes elsewhere).
 */
export async function claimDailyReward(uid) {
 const today = todayKey();
 const statusRef = doc(db, "dailyRewardStatus", uid);
 const userRef = doc(db, "users", uid);

 const result = await runTransaction(db, async (tx) => {
 const statusSnap = await tx.get(statusRef);
 const status = statusSnap.exists() ? statusSnap.data() : { day: 1, lastClaim: null };

 if (status.lastClaim === today) {
 return { alreadyClaimed: true };
 }

 const yesterday = todayKey(new Date(Date.now() - 86400000));
 // Missing a day (or this being day 8+ after finishing the cycle)
 // restarts at day 1 — same "miss a day, streak resets" rule the
 // Check-in tab already uses in lib/rewards.js.
 const nextDay = status.lastClaim === yesterday ? (status.day % 7) + 1 : 1;
 const slot = DAILY_REWARD_CYCLE[nextDay - 1];

 const userSnap = await tx.get(userRef);
 if (!userSnap.exists()) throw new Error("Profile not found");
 const currentCoins = userSnap.data().coins || 0;

 let chestPrize = null;
 if (slot.coins) {
 tx.update(userRef, { coins: currentCoins + slot.coins });
 }
 // Mystery chest coins/diamonds are resolved and credited here too, in
 // the same transaction, so the reward can't be claimed twice by a
 // slow client retry.
 const chestBonus = slot.bonus?.find((b) => b.type === "chest");
 if (chestBonus) {
 chestPrize = pickWeighted(MYSTERY_CHEST_PRIZES);
 const updates = { coins: currentCoins + (slot.coins || 0) + (chestPrize.coins || 0) };
 if (chestPrize.diamonds) {
 updates.diamonds = (userSnap.data().diamonds || 0) + chestPrize.diamonds;
 }
 tx.update(userRef, updates);
 }

 tx.set(statusRef, { day: nextDay, lastClaim: today, updatedAt: serverTimestamp() }, { merge: true });

 return { alreadyClaimed: false, day: nextDay, coinsAwarded: slot.coins || 0, slot, chestPrize };
 });

 if (!result.alreadyClaimed) {
 // Frame/vehicle bonuses (non-chest) — grant after the transaction above
 // has committed the coins + day advance.
 const itemBonuses = (result.slot.bonus || []).filter((b) => b.type === "frame" || b.type === "vehicle");
 for (const b of itemBonuses) {
 await grantTemporaryDecoration(uid, b.type, b.itemId, b.days);
 }
 }

 return result;
}
