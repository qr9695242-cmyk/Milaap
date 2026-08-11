// Secure Ludo client API. Paid operations are executed by Firebase Cloud
// Functions; the browser never writes coins, diamonds, dice or match state.
import {
  collection, doc, getDocs, onSnapshot, query, where, orderBy, limit,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "@/lib/firebase";

const MATCHES = "ludoMatches";
const functions = getFunctions(app);
const call = (name, data) => httpsCallable(functions, name)(data).then((r) => r.data);

export const LUDO_STAKES = [1000, 5000, 10000, 25000, 50000];
export const LUDO_COINS_PER_DIAMOND = 2.5;
export const LUDO_4P_COINS_PER_DIAMOND = 3;

export function coinsToLudoDiamonds(coins, playerCount = 2) {
  const rate = Number(playerCount) === 4 ? LUDO_4P_COINS_PER_DIAMOND : LUDO_COINS_PER_DIAMOND;
  return Math.floor(Number(coins || 0) / rate);
}

export async function createLudoMatch({ name, stake, mode, playerCount = 2 }) {
  return call("ludoCreate", { name, stake, mode, playerCount });
}

export function listenWaitingLudoMatches(callback, onError) {
  const q = query(collection(db, MATCHES), where("status", "==", "waiting"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => onError?.(err));
}

export function listenLudoMatch(matchId, callback, onError) {
  return onSnapshot(doc(db, MATCHES, matchId), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null), (err) => onError?.(err));
}

export async function joinLudoMatch({ matchId, name }) {
  return call("ludoJoin", { matchId, name });
}

export async function joinLudoByCode({ roomCode, name }) {
  const code = String(roomCode || "").trim();
  if (!/^\d{6}$/.test(code)) throw new Error("6 digit code daalein.");
  const q = query(collection(db, MATCHES), where("roomCode", "==", code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Room code galat hai.");
  const matchId = snap.docs[0].id;
  await joinLudoMatch({ matchId, name });
  return matchId;
}

export async function rollLudoMatch(matchId) {
  return call("ludoRoll", { matchId });
}

export async function moveLudoToken(matchId, tokenId) {
  return call("ludoMove", { matchId, tokenId });
}

// Kept as a compatibility guard: paid match state must never be patched by
// the browser. Callers should use rollLudoMatch/moveLudoToken instead.
export async function updateLudoMatch() {
  throw new Error("Security: direct Ludo state updates are disabled. Use the server-authoritative move API.");
}

export async function awardLudoWinner() {
  throw new Error("Security: Ludo rewards are settled automatically by the trusted server.");
}

export async function cancelWaitingLudoMatch({ matchId }) {
  return call("ludoCancel", { matchId });
}
