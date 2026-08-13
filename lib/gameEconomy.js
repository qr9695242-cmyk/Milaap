import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const GAME_STAKES = [0, 100, 500, 1000, 5000];

function clampInt(v, min = 0, max = 1_000_000_000) {
  return Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
}

/** Atomically reserves an optional virtual-coin entry and creates an idempotent game session. */
export async function beginGameSession({ uid, gameId, entryCoins = 0 }) {
  if (!uid) throw new Error("Login required");
  const entry = clampInt(entryCoins);
  const sessionRef = doc(collection(db, "gameSessions"));
  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("User profile not found");
    const coins = clampInt(snap.data().coins);
    if (coins < entry) throw new Error("Not enough coins");
    tx.update(userRef, { coins: coins - entry });
    tx.set(sessionRef, {
      uid, gameId, entryCoins: entry, status: "active", settled: false,
      startedAt: serverTimestamp(),
    });
  });
  return sessionRef.id;
}

/** Settles one session exactly once. Rewards are virtual coins only. */
export async function settleGameSession({ sessionId, uid, gameId, score = 0, rewardCoins = 0, outcome = "finished" }) {
  if (!sessionId || !uid) return { settled: false, rewardCoins: 0 };
  const sessionRef = doc(db, "gameSessions", sessionId);
  const userRef = doc(db, "users", uid);
  const historyRef = doc(collection(db, "users", uid, "gameHistory"));
  const safeScore = clampInt(score);
  const safeReward = clampInt(rewardCoins);
  let credited = 0;
  await runTransaction(db, async (tx) => {
    const [sessionSnap, userSnap] = await Promise.all([tx.get(sessionRef), tx.get(userRef)]);
    if (!sessionSnap.exists() || !userSnap.exists()) return;
    const session = sessionSnap.data();
    if (session.settled) return;
    const currentCoins = clampInt(userSnap.data().coins);
    credited = safeReward;
    tx.update(userRef, { coins: currentCoins + credited });
    tx.update(sessionRef, {
      settled: true, status: "finished", score: safeScore, rewardCoins: credited,
      outcome, finishedAt: serverTimestamp(),
    });
    tx.set(historyRef, {
      gameId: gameId || session.gameId, sessionId, score: safeScore,
      entryCoins: clampInt(session.entryCoins), rewardCoins: credited, outcome,
      createdAt: serverTimestamp(),
    });
  });
  return { settled: credited > 0 || safeReward === 0, rewardCoins: credited };
}

/** Skill-based reward: free games can earn coins without creating a second currency. */
export function scoreToReward(score, { entryCoins = 0, multiplier = 2, cap = 5000 } = {}) {
  const s = clampInt(score);
  const entry = clampInt(entryCoins);
  if (entry > 0) return Math.min(cap, entry + Math.floor(s * multiplier));
  return Math.min(cap, Math.floor(s * multiplier));
}

export async function cancelGameSession({ sessionId, uid }) {
  if (!sessionId || !uid) return;
  const sessionRef = doc(db, "gameSessions", sessionId);
  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const [sessionSnap, userSnap] = await Promise.all([tx.get(sessionRef), tx.get(userRef)]);
    if (!sessionSnap.exists() || !userSnap.exists()) return;
    const session = sessionSnap.data();
    if (session.settled) return;
    const coins = clampInt(userSnap.data().coins);
    tx.update(userRef, { coins: coins + clampInt(session.entryCoins) });
    tx.update(sessionRef, { settled: true, status: "cancelled", cancelledAt: serverTimestamp() });
  });
}
