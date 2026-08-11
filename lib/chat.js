import {
  collection,
  addDoc,
  query,
  orderBy,
  limitToLast,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export function listenChat(roomId, callback, max = 100) {
  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limitToLast(max)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function sendChatMessage(roomId, { uid, name, text, vipLevel = 0 }) {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "rooms", roomId, "messages"), {
    uid,
    name,
    text: trimmed.slice(0, 300),
    vipLevel,
    type: "chat",
    createdAt: serverTimestamp(),
  });
}

/**
 * TikTok-style VIP entry banner — jab VIP2+ user room mein aata hai,
 * sab ko dikhne wala ek "X entered the room" style special message
 * chat feed ke top jaisa render hota hai (LiveChat isse alag style
 * deta hai type:"entry" dekh kar).
 */
export async function sendEntryAnnouncement(roomId, { uid, name, vipLevel }) {
  await addDoc(collection(db, "rooms", roomId, "messages"), {
    uid,
    name,
    text: `${name} entered the room`,
    vipLevel,
    type: "entry",
    createdAt: serverTimestamp(),
  });
}
