import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function listenUserLudoWallet(uid, callback) {
  if (!uid) return () => {};

  const userRef = doc(db, "users", uid);

  return onSnapshot(
    userRef,
    (snap) => {
      const data = snap.exists() ? snap.data() : {};

      callback({
        coins: Number(data.coins || 0),
        diamonds: Number(data.diamonds || 0),
        ...(data.ludoWallet || {}),
      });
    },
    (err) => {
      console.error("[listenUserLudoWallet] Firestore error:", err);
      callback(null);
    }
  );
}