// Casual (free, no coin stake) 2-player real-time matchmaking. Unlike
// lib/ludoMatches.js, this needs no Cloud
// Function: there's no money on the line, so a plain Firestore
// transaction from the client is safe. One shared "casualMatches"
// collection, partitioned by `gameId` (e.g. "chess", "archery").
//
// Matchmaking is coordinated through a single "casualLobby/{gameId}" doc
// (one per game) that always points at the current open "waiting" match,
// if any. Everything — reading who's waiting, joining them, or opening a
// new waiting match — happens inside ONE Firestore transaction on that
// lobby doc + the match doc it points to. This makes matchmaking atomic:
// Firestore serializes/retries transactions that touch the same lobby
// doc, so two players tapping "Quick Match" at the same instant can no
// longer both create their own separate waiting match and sit stuck on
// "Finding opponent..." forever without ever seeing each other. (The old
// version did a plain, non-transactional getDocs() query to find a
// candidate match before joining — two concurrent calls could both read
// "no one waiting" and both create their own match.)
import {
 collection, doc, onSnapshot, query, where, orderBy, limit,
 runTransaction, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const MATCHES = "casualMatches";
const LOBBY = "casualLobby";

// Kept for compatibility with anything using the raw waiting list; no
// longer used internally by quickMatchCasual (superseded by the lobby doc).
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

/**
 * Atomically finds this gameId's open waiting match and joins it, or opens
 * a new one and registers it as the waiting match. `initialState` seeds any
 * game-specific fields (board, positions, etc). Safe against two players
 * matchmaking at the same instant.
 */
export async function quickMatchCasual({ gameId, uid, name, initialState = {} }) {
 const lobbyRef = doc(db, LOBBY, gameId);
 const newMatchRef = doc(collection(db, MATCHES));
 const stake = Math.max(0, Math.floor(Number(initialState.stakeCoins || 0)));
 const userRef = doc(db, "users", uid);

 const matchId = await runTransaction(db, async (tx) => {
  const lobbySnap = await tx.get(lobbyRef);
  const waitingId = lobbySnap.exists() ? lobbySnap.data().waitingMatchId : null;
  const waitingHostUid = lobbySnap.exists() ? lobbySnap.data().waitingHostUid : null;

  if (waitingId && waitingHostUid && waitingHostUid !== uid) {
   const matchRef = doc(db, MATCHES, waitingId);
   const matchSnap = await tx.get(matchRef);
   if (matchSnap.exists() && matchSnap.data().status === "waiting") {
    const match = matchSnap.data();
    const matchStake = Math.max(0, Math.floor(Number(match.stakeCoins || 0)));
    if (matchStake !== stake) throw new Error("Entry Coins mismatch. Please choose the same match stake.");

    const joinerSnap = await tx.get(userRef);
    if (!joinerSnap.exists()) throw new Error("User profile not found");
    const coins = Math.floor(Number(joinerSnap.data().coins || 0));
    if (coins < matchStake) throw new Error("Not enough coins for match entry.");
    if (matchStake > 0) tx.update(userRef, { coins: coins - matchStake });

    const players = [...(match.players || []), { uid, name }];
    tx.update(matchRef, {
     players,
     playerUids: players.map((p) => p.uid),
     status: "playing",
     startedAt: serverTimestamp(),
     entryPaidUids: { ...(match.entryPaidUids || {}), [uid]: true },
     pot: matchStake * players.length,
    });
    tx.set(lobbyRef, { waitingMatchId: null, waitingHostUid: null }, { merge: true });
    return waitingId;
   }
  }

  const hostSnap = await tx.get(userRef);
  if (!hostSnap.exists()) throw new Error("User profile not found");
  const hostCoins = Math.floor(Number(hostSnap.data().coins || 0));
  if (hostCoins < stake) throw new Error("Not enough coins for match entry.");
  if (stake > 0) tx.update(userRef, { coins: hostCoins - stake });

  tx.set(newMatchRef, {
   gameId,
   hostUid: uid,
   status: "waiting",
   players: [{ uid, name }],
   playerUids: [uid],
   turnUid: uid,
   winner: null,
   stakeCoins: stake,
   pot: stake,
   entryPaidUids: { [uid]: stake > 0 },
   createdAt: serverTimestamp(),
   ...initialState,
  });
  tx.set(lobbyRef, { waitingMatchId: newMatchRef.id, waitingHostUid: uid }, { merge: true });
  return newMatchRef.id;
 });
 return matchId;
}

export async function updateCasualMatch(matchId, patch) {
 await runTransaction(db, async (tx) => {
 const ref = doc(db, MATCHES, matchId);
 const cur = await tx.get(ref);
 if (!cur.exists()) return;
 tx.update(ref, patch);
 });
}

/**
 * Cancels a waiting match. Pass `gameId` too (when known) so the shared
 * lobby pointer is cleared in the same breath — otherwise the next player
 * to matchmake for this game could momentarily try to join a match that
 * no longer exists (harmless, since quickMatchCasual falls back to
 * opening a fresh match when that happens, but this keeps it clean).
 */
export async function cancelCasualMatch(matchId, gameId) {
 if (!matchId) return;
 const matchRef = doc(db, MATCHES, matchId);
 await runTransaction(db, async (tx) => {
  const snap = await tx.get(matchRef);
  if (!snap.exists()) return;
  const match = snap.data();
  if (gameId && match.gameId !== gameId) return;
  if (match.status !== "waiting") return;

  const uid = match.hostUid;
  const stake = Math.max(0, Math.floor(Number(match.stakeCoins || 0)));
  if (uid && stake > 0 && match.entryPaidUids?.[uid]) {
   const userRef = doc(db, "users", uid);
   const userSnap = await tx.get(userRef);
   if (userSnap.exists()) {
    tx.update(userRef, { coins: Math.floor(Number(userSnap.data().coins || 0)) + stake });
   }
  }
  if (gameId) {
   const lobbyRef = doc(db, LOBBY, gameId);
   const lobbySnap = await tx.get(lobbyRef);
   if (lobbySnap.exists() && lobbySnap.data().waitingMatchId === matchId) {
    tx.set(lobbyRef, { waitingMatchId: null, waitingHostUid: null }, { merge: true });
   }
  }
  tx.delete(matchRef);
 });
}

/**
 * Atomically settles a finished 2-player coin match.
 * Entry is deducted when each player joins. The winner receives the full pot;
 * a draw refunds each player's own stake. The payout/refund is idempotent.
 */
export async function settleCasualCoinMatch(matchId, uid) {
 await runTransaction(db, async (tx) => {
  const matchRef = doc(db, MATCHES, matchId);
  const matchSnap = await tx.get(matchRef);
  if (!matchSnap.exists()) return;
  const match = matchSnap.data();
  const stake = Math.max(0, Math.floor(Number(match.stakeCoins || 0)));
  const players = match.playerUids || [];
  if (match.status !== "finished" || stake <= 0 || !players.includes(uid)) return;

  const winner = match.winner || null;
  const userRef = doc(db, "users", uid);
  const userSnap = await tx.get(userRef);
  if (!userSnap.exists()) return;
  const coins = Math.floor(Number(userSnap.data().coins || 0));

  if (winner) {
   if (match.payoutSettled) return;
   if (!players.includes(winner)) throw new Error("Invalid match winner.");
   const winnerRef = doc(db, "users", winner);
   const winnerSnap = winner === uid ? userSnap : await tx.get(winnerRef);
   if (!winnerSnap.exists()) return;
   const pot = stake * players.length;
   tx.update(winnerRef, { coins: Math.floor(Number(winnerSnap.data().coins || 0)) + pot });
   tx.update(matchRef, { payoutSettled: true, settledAt: serverTimestamp() });
   return;
  }

  const refunds = match.refundUids || {};
  if (refunds[uid]) return;
  tx.update(userRef, { coins: coins + stake });
  tx.update(matchRef, { [`refundUids.${uid}`]: true });
 });
}

