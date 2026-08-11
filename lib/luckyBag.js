// Lucky Bag — "open a bag, win coins instantly". One free open per user
// per rolling 24h window, tracked server-side (Firestore) so it can't be
// bypassed by clearing local storage or reinstalling.
//
// Reward table is a weighted draw: mostly small amounts, rare big wins —
// classic loot-box feel without ever costing the player anything (it's
// a retention freebie, not a purchase).

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

// [amount, weight] — bigger weight = more common.
const REWARD_TABLE = [
  [10, 40],
  [25, 25],
  [50, 15],
  [100, 10],
  [250, 6],
  [500, 3],
  [1000, 1],
];

function rollReward() {
  const totalWeight = REWARD_TABLE.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (const [amount, weight] of REWARD_TABLE) {
    if (roll < weight) return amount;
    roll -= weight;
  }
  return REWARD_TABLE[0][0];
}

/**
 * Attempts to open today's lucky bag for a user.
 * Returns { amount, coins } on success.
 * Throws an Error with a friendly message if already opened today.
 */
export async function openLuckyBag(uid) {
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Profile not found");

    const data = snap.data();
    const lastOpenedMs = data.lastLuckyBagAt?.toMillis?.() ?? 0;
    const now = Date.now();

    if (now - lastOpenedMs < COOLDOWN_MS) {
      const remainingMs = COOLDOWN_MS - (now - lastOpenedMs);
      const hrs = Math.ceil(remainingMs / (60 * 60 * 1000));
      throw new Error(`Already opened today's bag. Try again in ~${hrs}h.`);
    }

    const amount = rollReward();
    const newCoins = (data.coins || 0) + amount;

    tx.update(userRef, {
      coins: newCoins,
      lastLuckyBagAt: serverTimestamp(),
    });

    return { amount, coins: newCoins };
  });
}

/** How many ms remain until the user's next free bag (0 = available now). */
export function luckyBagCooldownRemaining(lastLuckyBagAt) {
  const lastMs = lastLuckyBagAt?.toMillis?.() ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastMs);
  return Math.max(0, remaining);
}
