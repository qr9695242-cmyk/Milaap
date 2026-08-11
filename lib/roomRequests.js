import {
  addDoc, collection, doc, onSnapshot, query, serverTimestamp,
  updateDoc, where, orderBy, limit,
} from "firebase/firestore";
import { db } from "./firebase";

export async function sendSeatRequest({ roomId, fromUid, fromName, toUid, toName, seatIndex }) {
  await addDoc(collection(db, "rooms", roomId, "seatRequests"), {
    type: "seat",
    fromUid,
    fromName,
    toUid,
    toName,
    seatIndex,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export function listenIncomingSeatRequests(roomId, uid, callback) {
  const q = query(
    collection(db, "rooms", roomId, "seatRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function respondSeatRequest(roomId, requestId, status) {
  await updateDoc(doc(db, "rooms", roomId, "seatRequests", requestId), {
    status,
    respondedAt: serverTimestamp(),
  });
}
