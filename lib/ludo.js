import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// Read-only Ludo stats used by the Medal screen. The authoritative paid-game
// state remains in Cloud Functions; this listener only mirrors the optional
// users/{uid}/ludoWallet/balance summary when it exists.
export function listenUserLudoWallet(uid, callback, onError) {
  if (!uid) return () => {};
  return onSnapshot(
    doc(db, "users", uid, "ludoWallet", "balance"),
    (snap) => callback(snap.exists() ? snap.data() : null),
    (err) => { console.error("Ludo wallet stats load failed", err); onError?.(err); }
  );
}
