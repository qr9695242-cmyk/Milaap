// Daily Tasks/Rewards, Lucky Box, and Spin Wheel.
// All state lives in a single rewardStatus/{uid} doc (owner-only, see
// firestore.rules) so it's one cheap read for the whole rewards page.
import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// ---- Daily check-in ----------------------------------------------------

// Coins for each day of a 7-day streak; resets to day 1 if a day is missed.
export const CHECKIN_REWARDS = [50, 75, 100, 150, 200, 300, 500];

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, UTC — good enough for a streak counter
}

export function listenRewardStatus(uid, callback) {
  // One-shot read wrapped to look like the app's other listen* helpers,
  // since this doc changes only from user-triggered actions (no need for
  // a live subscription / extra listener).
  getDoc(doc(db, "rewardStatus", uid)).then((snap) => {
    callback(snap.exists() ? snap.data() : { streak: 0, lastCheckin: null });
  });
}

/** Returns { alreadyClaimed } or { alreadyClaimed:false, coinsAwarded, streak } */
export async function claimDailyCheckin(uid) {
  const today = todayKey();
  const statusRef = doc(db, "rewardStatus", uid);
  const userRef = doc(db, "users", uid);

  return runTransaction(db, async (tx) => {
    const statusSnap = await tx.get(statusRef);
    const status = statusSnap.exists() ? statusSnap.data() : { streak: 0, lastCheckin: null };

    if (status.lastCheckin === today) {
      return { alreadyClaimed: true };
    }

    const yesterday = todayKey(new Date(Date.now() - 86400000));
    const streak = status.lastCheckin === yesterday ? (status.streak || 0) + 1 : 1;
    const dayInCycle = ((streak - 1) % CHECKIN_REWARDS.length);
    const coinsAwarded = CHECKIN_REWARDS[dayInCycle];

    const userSnap = await tx.get(userRef);
    const currentCoins = userSnap.exists() ? userSnap.data().coins || 0 : 0;

    tx.set(statusRef, { streak, lastCheckin: today }, { merge: true });
    tx.update(userRef, { coins: currentCoins + coinsAwarded });

    return { alreadyClaimed: false, coinsAwarded, streak };
  });
}

// ---- Lucky Box -----------------------------------------------------------

export const LUCKY_BOX_COST = 100;
// weight = relative chance; prize.coins/diamonds is what's won
const LUCKY_BOX_PRIZES = [
  { label: "20 coins", coins: 20, weight: 35 },
  { label: "80 coins", coins: 80, weight: 25 },
  { label: "150 coins", coins: 150, weight: 18 },
  { label: "10 diamonds", diamonds: 10, weight: 12 },
  { label: "50 diamonds", diamonds: 50, weight: 7 },
  { label: "500 diamonds JACKPOT", diamonds: 500, weight: 3 },
];

export const SPIN_WHEEL_COST = 50;
const SPIN_WHEEL_PRIZES = [
  { label: "10 coins", coins: 10, weight: 30 },
  { label: "30 coins", coins: 30, weight: 25 },
  { label: "60 coins", coins: 60, weight: 20 },
  { label: "120 coins", coins: 120, weight: 12 },
  { label: "5 diamonds", diamonds: 5, weight: 8 },
  { label: "250 diamonds JACKPOT", diamonds: 250, weight: 5 },
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

async function playGame({ uid, cost, prizes, logCollection }) {
  const userRef = doc(db, "users", uid);
  const prize = pickWeighted(prizes);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Profile not found");
    const data = snap.data();
    const coins = data.coins || 0;
    if (coins < cost) throw new Error("Not enough coins");

    const update = { coins: coins - cost + (prize.coins || 0) };
    if (prize.diamonds) update.diamonds = (data.diamonds || 0) + prize.diamonds;
    tx.update(userRef, update);
  });

  // Best-effort log, not required for the transaction to have succeeded.
  try {
    await setDoc(
      doc(db, logCollection, `${uid}_${Date.now()}`),
      { uid, prize: prize.label, createdAt: serverTimestamp() }
    );
  } catch {
    /* log failure shouldn't block the win */
  }

  return prize;
}

export function openLuckyBox(uid) {
  return playGame({ uid, cost: LUCKY_BOX_COST, prizes: LUCKY_BOX_PRIZES, logCollection: "luckyBoxLog" });
}

export function spinWheel(uid) {
  return playGame({ uid, cost: SPIN_WHEEL_COST, prizes: SPIN_WHEEL_PRIZES, logCollection: "spinWheelLog" });
}
