// Casual (free, no coin stake) 2-player real-time matchmaking. Unlike
// lib/ludoMatches.js / lib/snakeLadderMatches.js, this needs no Cloud
// Function: there's no money on the line, so a plain Firestore
// transaction from the client is safe. One shared "casualMatches"
// collection, partitioned by `gameId` (e.g. "chess", "quiz").
import {
  collection, doc, onSnapshot, query, where, orderBy, limit,
  runTransaction, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const MATCHES = "casualMatches";

export function listenWaitingCasualMatches(gameId, callback, onError) {
  const q = query(
    collection(db, MATCHES),
    where("gameId", "==", gameId),
    where("status", "==", "waiting"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => onError?.(err));
}

export function listenCasualMatch(matchId, callback, onError) {
  return onSnapshot(doc(db, MATCHES, matchId), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null), (err) => onError?.(err));
}

/** Finds an open waiting match for this gameId and joins it, or creates a new one. `initialState` seeds any game-specific fields (board, positions, etc). */
export async function quickMatchCasual({ gameId, uid, name, initialState = {} }) {
  const q = query(
    collection(db, MATCHES),
    where("gameId", "==", gameId),
    where("status", "==", "waiting"),
    orderBy("createdAt", "asc"),
    limit(5)
  );
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(q);
  const candidate = snap.docs.find((d) => d.data().hostUid !== uid);

  if (candidate) {
    const ref = doc(db, MATCHES, candidate.id);
    const joined = await runTransaction(db, async (tx) => {
      const cur = await tx.get(ref);
      if (!cur.exists() || cur.data().status !== "waiting") return null;
      const players = [...(cur.data().players || []), { uid, name }];
      tx.update(ref, {
        players,
        playerUids: players.map((p) => p.uid),
        status: "playing",
        startedAt: serverTimestamp(),
      });
      return candidate.id;
    });
    if (joined) return joined;
  }

  const ref = doc(collection(db, MATCHES));
  await runTransaction(db, async (tx) => {
    tx.set(ref, {
      gameId,
      hostUid: uid,
      status: "waiting",
      players: [{ uid, name }],
      playerUids: [uid],
      turnUid: uid,
      winner: null,
      createdAt: serverTimestamp(),
      ...initialState,
    });
  });
  return ref.id;
}

export async function updateCasualMatch(matchId, patch) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, MATCHES, matchId);
    const cur = await tx.get(ref);
    if (!cur.exists()) return;
    tx.update(ref, patch);
  });
}

export async function cancelCasualMatch(matchId) {
  await deleteDoc(doc(db, MATCHES, matchId));
}
