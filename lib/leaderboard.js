import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/** Top diamond earners (hosts who received the most gifts) */
export function listenTopEarners(callback, max = 20) {
  const q = query(collection(db, "users"), orderBy("diamonds", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Top spenders (viewers who recharged the most, lifetime) */
export function listenTopSpenders(callback, max = 20) {
  const q = query(collection(db, "users"), orderBy("totalRechargedRs", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
