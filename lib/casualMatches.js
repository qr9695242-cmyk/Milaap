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

 const matchId = await runTransaction(db, async (tx) => {
 const lobbySnap = await tx.get(lobbyRef);
 const waitingId = lobbySnap.exists() ? lobbySnap.data().waitingMatchId : null;
 const waitingHostUid = lobbySnap.exists() ? lobbySnap.data().waitingHostUid : null;

 // Someone else is already waiting for this game — join them.
 if (waitingId && waitingHostUid && waitingHostUid !== uid) {
 const matchRef = doc(db, MATCHES, waitingId);
 const matchSnap = await tx.get(matchRef);
 if (matchSnap.exists() && matchSnap.data().status === "waiting") {
 const players = [...(matchSnap.data().players || []), { uid, name }];
 tx.update(matchRef, {
 players,
 playerUids: players.map((p) => p.uid),
 status: "playing",
 startedAt: serverTimestamp(),
 });
 tx.set(lobbyRef, { waitingMatchId: null, waitingHostUid: null }, { merge: true });
 return waitingId;
 }
 // Lobby was pointing at a stale/cancelled match — fall through and
 // open a fresh one below, overwriting the stale pointer.
 }

 // No one waiting (or the "waiting" player is us, e.g. a retry) — open
 // a new match and register it as the one others should join.
 tx.set(newMatchRef, {
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
 if (gameId) {
 const lobbyRef = doc(db, LOBBY, gameId);
 await runTransaction(db, async (tx) => {
 const lobbySnap = await tx.get(lobbyRef);
 if (lobbySnap.exists() && lobbySnap.data().waitingMatchId === matchId) {
 tx.set(lobbyRef, { waitingMatchId: null, waitingHostUid: null }, { merge: true });
 }
 });
 }
 await deleteDoc(doc(db, MATCHES, matchId));
}


/**
 * Simple coin-match settlement.
 * The losing player's stake is transferred to the winner after a finished match.
 * Draws transfer nothing. Each player settles only their own wallet entry, so
 * the same player cannot be credited twice for the same match.
 */
export async function settleCasualCoinMatch(matchId, uid) {
 await runTransaction(db, async (tx) => {
 const matchRef = doc(db, MATCHES, matchId);
 const matchSnap = await tx.get(matchRef);
 if (!matchSnap.exists()) return;

 const match = matchSnap.data();
 const stake = Number(match.stakeCoins || 0);
 if (match.status !== "finished" || stake <= 0) return;
 if (!(match.playerUids || []).includes(uid)) return;
 if (!match.winner) return; // draw: no coin transfer

 const settled = match.coinSettledUids || {};
 if (settled[uid]) return;

 const userRef = doc(db, "users", uid);
 const userSnap = await tx.get(userRef);
 if (!userSnap.exists()) return;

 const currentCoins = Number(userSnap.data().coins || 0);
 const delta = match.winner === uid ? stake : -stake;
 if (delta < 0 && currentCoins < stake) {
 throw new Error("Match settle karne ke liye coins kam hain.");
 }

 tx.update(userRef, { coins: currentCoins + delta });
 tx.update(matchRef, {
 [`coinSettledUids.${uid}`]: true,
 });
 });
}
