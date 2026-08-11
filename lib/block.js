// User blocking & reporting.
// Blocks are one-directional edges (like follows): "blocks/{blockerId}_{blockedId}".
// Reports are just logged for an admin to review in the Admin Panel later
// (Phase 4 doesn't auto-suspend anyone — a human should look at reports).
import {
  doc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";

function edgeId(blockerId, blockedId) {
  return `${blockerId}_${blockedId}`;
}

export async function blockUser(blockerUid, blockerName, target) {
  // target = { uid, displayName }
  // Also remove their follow-of-you (if any) so a blocked user stops
  // showing up in your followers list, keeping the counters in sync.
  const theirFollowRef = doc(db, "follows", `${target.uid}_${blockerUid}`);
  await runTransaction(db, async (tx) => {
    const followSnap = await tx.get(theirFollowRef);
    if (followSnap.exists()) {
      tx.delete(theirFollowRef);
      tx.set(doc(db, "users", target.uid), { followingCount: increment(-1) }, { merge: true });
      tx.set(doc(db, "users", blockerUid), { followersCount: increment(-1) }, { merge: true });
    }
    tx.set(doc(db, "blocks", edgeId(blockerUid, target.uid)), {
      blockerId: blockerUid,
      blockerName,
      blockedId: target.uid,
      blockedName: target.displayName || "User",
      createdAt: serverTimestamp(),
    });
  });
}

export async function unblockUser(blockerUid, blockedUid) {
  await deleteDoc(doc(db, "blocks", edgeId(blockerUid, blockedUid)));
}

export function listenIsBlocked(blockerUid, blockedUid, callback) {
  if (!blockerUid || !blockedUid) return () => {};
  return onSnapshot(doc(db, "blocks", edgeId(blockerUid, blockedUid)), (snap) => {
    callback(snap.exists());
  });
}

export function listenBlockedList(blockerUid, callback) {
  const q = query(
    collection(db, "blocks"),
    where("blockerId", "==", blockerUid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export const REPORT_REASONS = [
  "Fake profile",
  "Harassment or abuse",
  "Inappropriate content",
  "Scam / fraud",
  "Underage user",
  "Other",
];

export async function reportUser({ reporterUid, reporterName, target, reason, details = "" }) {
  await addDoc(collection(db, "reports"), {
    type: "user",
    reporterUid,
    reporterName,
    targetUid: target.uid,
    targetName: target.displayName || "User",
    reason,
    details,
    status: "pending", // admin can mark "reviewed" / "actioned" in Admin Panel
    createdAt: serverTimestamp(),
  });
}
