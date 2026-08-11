// Real-time online status — "best effort" presence built on Firestore
// (no Realtime Database in this project, so no true onDisconnect hook).
// We write a heartbeat timestamp every 30s while the tab is open/visible,
// and treat a user as online if that timestamp is under ~45s old. This
// means "online" can lag by up to ~45s after someone closes the tab —
// fine for a status dot, not something to build billing logic on.
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const HEARTBEAT_MS = 30_000;
export const ONLINE_THRESHOLD_MS = 45_000;

export function startPresenceHeartbeat(uid) {
  if (!uid) return () => {};

  const beat = () => {
    setDoc(doc(db, "users", uid), { lastActiveAt: serverTimestamp() }, { merge: true }).catch(() => {});
  };

  beat(); // immediately on mount/login
  const interval = setInterval(beat, HEARTBEAT_MS);

  const onVisible = () => {
    if (document.visibilityState === "visible") beat();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Pass a Firestore Timestamp (or null) — returns true if recently active */
export function isOnline(lastActiveAt) {
  if (!lastActiveAt) return false;
  const ms = lastActiveAt.toMillis ? lastActiveAt.toMillis() : new Date(lastActiveAt).getTime();
  return Date.now() - ms < ONLINE_THRESHOLD_MS;
}
