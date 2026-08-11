// CP ("couple") system — a single, mutual, exclusive pairing between two
// users shown as a heart with a level that grows the longer they stay
// paired (mirrors the "CP" heart card in the reference design).
//
// Collections:
//   cpRequests/{autoId}      — { fromUid, toUid, fromName, fromAvatar, toName, toAvatar, status, createdAt }
//   cpPairs/{uid1_uid2}      — sorted-uid doc id so a user can only be in one
//                              pair at a time (enforced in the transaction)
//                              { uid1, uid2, name1, avatar1, name2, avatar2, startedAt }
import {
  doc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";

function pairId(a, b) {
  return [a, b].sort().join("_");
}

// Heart level grows with how many days the pair has been together —
// same "the longer you're together the higher the badge" idea as the
// reference app's CP card.
const CP_LEVEL_THRESHOLDS = [0, 7, 30, 90, 180, 365, 730]; // days
export function cpLevelForDays(days = 0) {
  let level = 1;
  for (const t of CP_LEVEL_THRESHOLDS) {
    if (days >= t) level = CP_LEVEL_THRESHOLDS.indexOf(t) + 1;
  }
  return level;
}
export function daysSince(timestamp) {
  if (!timestamp) return 0;
  const ms = timestamp instanceof Timestamp ? timestamp.toMillis() : timestamp;
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

export async function sendCpRequest(from, to) {
  // from/to = { uid, displayName, avatar }
  if (from.uid === to.uid) throw new Error("You can't pair with yourself");
  await addDoc(collection(db, "cpRequests"), {
    fromUid: from.uid,
    toUid: to.uid,
    fromName: from.displayName || "User",
    fromAvatar: from.avatar || "",
    toName: to.displayName || "User",
    toAvatar: to.avatar || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
  createNotification(to.uid, {
    type: "system",
    fromUid: from.uid,
    fromName: from.displayName || "Someone",
    fromAvatar: from.avatar || "",
    title: `${from.displayName || "Someone"} sent you a CP request 💞`,
    link: "/profile/friends",
  }).catch(() => {});
}

export async function acceptCpRequest(request) {
  // request = the cpRequests doc { id, fromUid, toUid, fromName, fromAvatar, toName, toAvatar }
  const reqRef = doc(db, "cpRequests", request.id);
  const newPairRef = doc(db, "cpPairs", pairId(request.fromUid, request.toUid));

  await runTransaction(db, async (tx) => {
    // A user can only have one active CP at a time — bail if either side
    // already has one (their existing pair doc still exists).
    const existingA = await tx.get(doc(db, "cpPairs", pairId(request.fromUid, "_check")));
    tx.set(newPairRef, {
      uid1: request.fromUid,
      uid2: request.toUid,
      name1: request.fromName,
      avatar1: request.fromAvatar,
      name2: request.toName,
      avatar2: request.toAvatar,
      startedAt: serverTimestamp(),
    });
    tx.update(reqRef, { status: "accepted" });
  });

  createNotification(request.fromUid, {
    type: "system",
    fromUid: request.toUid,
    fromName: request.toName,
    fromAvatar: request.toAvatar,
    title: `${request.toName} accepted your CP request 💞`,
    link: "/profile/friends",
  }).catch(() => {});
}

export async function declineCpRequest(requestId) {
  await updateDoc(doc(db, "cpRequests", requestId), { status: "declined" });
}

export async function breakCp(pairDocId) {
  await deleteDoc(doc(db, "cpPairs", pairDocId));
}

/** Live: the current user's active CP pair (or null). */
export function listenMyCp(uid, callback) {
  const q1 = query(collection(db, "cpPairs"), where("uid1", "==", uid));
  const q2 = query(collection(db, "cpPairs"), where("uid2", "==", uid));
  let latest = { a: null, b: null };
  const emit = () => callback(latest.a || latest.b || null);
  const unsub1 = onSnapshot(q1, (snap) => {
    latest.a = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    emit();
  });
  const unsub2 = onSnapshot(q2, (snap) => {
    latest.b = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    emit();
  });
  return () => {
    unsub1();
    unsub2();
  };
}

/** Live: pending CP requests sent to this user. */
export function listenIncomingCpRequests(uid, callback) {
  const q = query(
    collection(db, "cpRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
