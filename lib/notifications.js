// In-app notifications — Firestore based (push/FCM is a separate, later
// phase since it needs a VAPID key + service worker setup on your end).
// Each user has their own notifications/{uid}/items subcollection so
// reads are cheap and rules stay simple (owner-only).
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { ADMIN_EMAILS } from "./config";

// type: "follow" | "gift" | "system" | "family" | "pk"
export async function createNotification(toUid, { type, fromUid = null, fromName = null, fromAvatar = null, title, body = "", link = null }) {
  if (!toUid) return;
  await addDoc(collection(db, "notifications", toUid, "items"), {
    type,
    fromUid,
    fromName,
    fromAvatar,
    title,
    body,
    link,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Live subscription to the latest notifications for a user (newest first) */
export function listenNotifications(uid, callback, max = 50) {
  const q = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Lightweight unread-count subscription for the bell badge */
export function listenUnreadCount(uid, callback) {
  const q = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(50) // badge caps at "50+" — good enough, avoids reading the whole history
  );
  return onSnapshot(q, (snap) => {
    const unread = snap.docs.filter((d) => d.data().read === false).length;
    callback(unread);
  });
}

export async function markAsRead(uid, notifId) {
  await updateDoc(doc(db, "notifications", uid, "items", notifId), { read: true });
}

/**
 * Sirf ADMIN_EMAILS (lib/config.js) wale users ko notification bhejta hai —
 * koi aur isse trigger nahi kar sakta na dekh sakta hai, kyunki notification
 * hamesha us admin ke apne uid ke andar (notifications/{adminUid}/items)
 * jaati hai jo sirf wahi (apni Gmail se login karke) padh sakta hai.
 * Recharge request submit hone par admin panel ke bell icon
 * (NotificationBell) mein turant dikh jayega — web ho ya mobile browser,
 * dono jagah wahi ek app hai.
 */
export async function notifyAdmins({ title, body = "", link = "/admin" }) {
  for (const email of ADMIN_EMAILS) {
    const q = query(collection(db, "users"), where("email", "==", email), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) continue;
    const adminUid = snap.docs[0].id;
    await createNotification(adminUid, { type: "system", title, body, link });
  }
}

export async function markAllAsRead(uid, items) {
  // items = current loaded list (from listenNotifications) so we don't
  // need an extra read just to batch-update.
  const unread = items.filter((n) => !n.read);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((n) => {
    batch.update(doc(db, "notifications", uid, "items", n.id), { read: true });
  });
  await batch.commit();
}

/**
 * Broadcast "X is online" into every OTHER user's notification inbox.
 * Called once per app session from lib/presence.js when someone comes
 * online (not on every 30s heartbeat tick).
 *
 * ⚠️ Cost/scale note: this reads the entire `users` collection and writes
 * one notification doc per user, every single time anyone opens the app.
 * That's fine while you're testing with a handful of accounts, but once
 * you have real users this turns every login into thousands of reads +
 * writes (and everyone's bell blows up nonstop). Before going live with
 * a real user base, move this to a Cloud Function queued on presence
 * changes, or switch to a single shared "who's online" feed doc that
 * clients read instead of fanning out into every personal inbox.
 */
export async function notifyAllUsersOnline({ uid, name }) {
  if (!uid) return;
  const snap = await getDocs(collection(db, "users"));
  const targets = snap.docs.map((d) => d.id).filter((id) => id !== uid);
  if (!targets.length) return;

  const CHUNK = 450; // stay under Firestore's 500-operation batch limit
  for (let i = 0; i < targets.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const toUid of targets.slice(i, i + CHUNK)) {
      const ref = doc(collection(db, "notifications", toUid, "items"));
      batch.set(ref, {
        type: "system",
        fromUid: uid,
        fromName: name || "User",
        fromAvatar: null,
        title: `${name || "Koi"} online aa gaya hai`,
        body: "",
        link: `/u/${uid}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}
