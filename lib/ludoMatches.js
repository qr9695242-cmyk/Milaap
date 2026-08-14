// Secure Ludo client API. Paid operations are executed by Firebase Cloud
// Functions; the browser never writes coins, diamonds, dice or match state.
import {
  collection, doc, getDocs, onSnapshot, query, where, orderBy, limit,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "@/lib/firebase";

const MATCHES = "ludoMatches";
const functions = getFunctions(app);
const call = async (name, data) => {
  try {
    const result = await httpsCallable(functions, name)(data);
    return result.data;
  } catch (err) {
    const code = String(err?.code || "").replace(/^functions\//, "");
    const message = String(err?.message || "").trim();
    const details = typeof err?.details === "string" ? err.details.trim() : "";
    const isUnavailable = ["unavailable", "not-found", "deadline-exceeded"].includes(code);
    const diagnostic = isUnavailable
      ? `Ludo server service (${name}) available nahi hai. Firebase Cloud Functions deploy/check karein. Code: ${code || "unknown"}${details ? ` — ${details}` : ""}`
      : message || `Ludo server request failed (${name}). Code: ${code || "unknown"}`;
    const wrapped = new Error(diagnostic);
    wrapped.code = err?.code || code || "unknown";
    wrapped.details = err?.details;
    wrapped.originalError = err;
    throw wrapped;
  }
};

export const LUDO_STAKES = [1000, 5000, 10000, 25000, 50000];

// Coin-to-coin: the winner simply takes the whole Coin pot. No Diamond conversion.
export function ludoWinnerCoins(pot) {
  return Number(pot || 0);
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
