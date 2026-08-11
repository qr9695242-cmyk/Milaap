// Follow / Following system.
// Model: a top-level "follows" collection, one doc per relationship with a
// deterministic id (`${followerId}_${followingId}`) so we can read/write
// a specific edge without a query, plus denormalized followersCount /
// followingCount on the user doc (updated in the same transaction) so
// profile screens don't need to count documents on every load.
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";

function edgeId(followerId, followingId) {
  return `${followerId}_${followingId}`;
}

export async function followUser(follower, target) {
  // follower/target = { uid, displayName, avatar }
  if (follower.uid === target.uid) return; // can't follow yourself
  const edgeRef = doc(db, "follows", edgeId(follower.uid, target.uid));
  const followerUserRef = doc(db, "users", follower.uid);
  const targetUserRef = doc(db, "users", target.uid);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(edgeRef);
    if (existing.exists()) return; // already following, no-op

    tx.set(edgeRef, {
      followerId: follower.uid,
      followingId: target.uid,
      followerName: follower.displayName || "User",
      followerAvatar: follower.avatar || "",
      followingName: target.displayName || "User",
      followingAvatar: target.avatar || "",
      createdAt: serverTimestamp(),
    });
    tx.set(followerUserRef, { followingCount: increment(1) }, { merge: true });
    tx.set(targetUserRef, { followersCount: increment(1) }, { merge: true });
  });

  createNotification(target.uid, {
    type: "follow",
    fromUid: follower.uid,
    fromName: follower.displayName || "User",
    fromAvatar: follower.avatar || "",
    title: `${follower.displayName || "Someone"} started following you`,
    link: `/u/${follower.uid}`,
  }).catch(() => {}); // best-effort, don't block the follow action on it
}

export async function unfollowUser(followerUid, targetUid) {
  const edgeRef = doc(db, "follows", edgeId(followerUid, targetUid));
  const followerUserRef = doc(db, "users", followerUid);
  const targetUserRef = doc(db, "users", targetUid);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(edgeRef);
    if (!existing.exists()) return;
    tx.delete(edgeRef);
    tx.set(followerUserRef, { followingCount: increment(-1) }, { merge: true });
    tx.set(targetUserRef, { followersCount: increment(-1) }, { merge: true });
  });
}

/** Live "am I following this user" check — drives the FollowButton state */
export function listenIsFollowing(followerUid, targetUid, callback) {
  if (!followerUid || !targetUid) return () => {};
  return onSnapshot(doc(db, "follows", edgeId(followerUid, targetUid)), (snap) => {
    callback(snap.exists());
  });
}

export function listenFollowers(uid, callback) {
  const q = query(
    collection(db, "follows"),
    where("followingId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function listenFollowing(uid, callback) {
  const q = query(
    collection(db, "follows"),
    where("followerId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
