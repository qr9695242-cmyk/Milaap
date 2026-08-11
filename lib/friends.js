// Friends system — mutual, request-based (not the same as one-way
// follow/follower). Mirrors the "Friend (4/9)" grid in the reference
// design: a capped number of slots, each showing a level badge and how
// many days the friendship has lasted.
//
// Collections:
//   friendRequests/{autoId} — { fromUid, toUid, fromName, fromAvatar, toName, toAvatar, status, createdAt }
//   friendships/{uid1_uid2} — sorted-uid doc id, one doc per pair
//                             { uid1, uid2, name1, avatar1, name2, avatar2, since }
import {
  doc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";
import { daysSince } from "./cp";

export const MAX_FRIEND_SLOTS = 9; // matches the reference app's "Friend (x/9)" cap

function pairId(a, b) {
  return [a, b].sort().join("_");
}

// Friendship level grows with days together — same idea as CP but on a
// gentler curve since friends are easier to make than a CP pair.
const FRIEND_LEVEL_THRESHOLDS = [0, 3, 10, 30, 60, 100, 150, 200, 300];
export function friendLevelForDays(days = 0) {
  let level = 1;
  for (const t of FRIEND_LEVEL_THRESHOLDS) {
    if (days >= t) level = FRIEND_LEVEL_THRESHOLDS.indexOf(t) + 1;
  }
  return level;
}
export { daysSince };

export async function sendFriendRequest(from, to) {
  if (from.uid === to.uid) throw new Error("You can't friend yourself");
  await addDoc(collection(db, "friendRequests"), {
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
    title: `${from.displayName || "Someone"} sent you a friend request`,
    link: "/profile/friends",
  }).catch(() => {});
}

export async function acceptFriendRequest(request) {
  const reqRef = doc(db, "friendRequests", request.id);
  const friendRef = doc(db, "friendships", pairId(request.fromUid, request.toUid));
  await setDoc(friendRef, {
    uid1: request.fromUid,
    uid2: request.toUid,
    name1: request.fromName,
    avatar1: request.fromAvatar,
    name2: request.toName,
    avatar2: request.toAvatar,
    since: serverTimestamp(),
  });
  await updateDoc(reqRef, { status: "accepted" });

  createNotification(request.fromUid, {
    type: "system",
    fromUid: request.toUid,
    fromName: request.toName,
    fromAvatar: request.toAvatar,
    title: `${request.toName} accepted your friend request`,
    link: "/profile/friends",
  }).catch(() => {});
}

export async function declineFriendRequest(requestId) {
  await updateDoc(doc(db, "friendRequests", requestId), { status: "declined" });
}

export async function removeFriend(friendDocId) {
  await deleteDoc(doc(db, "friendships", friendDocId));
}

/** Live: this user's accepted friendships, newest first. */
export function listenMyFriends(uid, callback) {
  const q1 = query(collection(db, "friendships"), where("uid1", "==", uid));
  const q2 = query(collection(db, "friendships"), where("uid2", "==", uid));
  let latest = { a: [], b: [] };
  const emit = () => {
    const merged = [...latest.a, ...latest.b].sort(
      (x, y) => (y.since?.toMillis?.() || 0) - (x.since?.toMillis?.() || 0)
    );
    callback(merged);
  };
  const unsub1 = onSnapshot(q1, (snap) => {
    latest.a = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
  });
  const unsub2 = onSnapshot(q2, (snap) => {
    latest.b = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
  });
  return () => {
    unsub1();
    unsub2();
  };
}

/** Live: pending friend requests sent to this user. */
export function listenIncomingFriendRequests(uid, callback) {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
