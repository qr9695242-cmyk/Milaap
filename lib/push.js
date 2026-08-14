// Registers this device for push notifications and saves its FCM token on
// the user's profile so functions/index.js can target it. This is what
// makes an in-app notification (lib/notifications.js) ALSO show up as a
// real push notification outside the app (notification tray / lock screen),
// not just inside the bell icon.
//
// Setup needed on your end before this works (client code alone can't do
// this — it needs your actual Firebase project values):
// 1. Firebase console → Project Settings → Cloud Messaging → generate a
// Web Push "VAPID key pair", then set it as an env var:
// NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
// 2. Open public/firebase-messaging-sw.js and paste in the SAME
// firebaseConfig values already used in lib/firebase.js (these are
// public/safe to expose — that file can't read process.env since
// it's a static file, not part of the Next.js build).
// 3. Deploy functions/index.js (`firebase deploy --only functions`) —
// needs the Blaze (pay-as-you-go) plan, Cloud Functions v2 requires it.

import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { app, db } from "@/lib/firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function registerForPushNotifications(uid) {
 if (typeof window === "undefined" || !("Notification" in window) || !uid) return null;
 if (!VAPID_KEY) {
 console.warn("[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY not set — skipping push registration.");
 return null;
 }

 try {
 if (!(await isSupported())) return null; // Safari/older browsers, etc.

 const permission = await Notification.requestPermission();
 if (permission !== "granted") return null;

 const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
 const messaging = getMessaging(app);
 const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
 if (!token) return null;

 // Stored as an array since a user may have more than one device.
 await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
 return token;
 } catch (err) {
 console.error("[push] registration failed:", err);
 return null;
 }
}

// Foreground messages (app already open) — Firebase does NOT auto-show a
// system notification in this case, so show your own in-app toast/banner
// with whatever you pass to onNotification here.
export function listenForegroundPush(onNotification) {
 if (typeof window === "undefined") return () => {};
 let unsub = () => {};
 isSupported()
 .then((ok) => {
 if (!ok) return;
 const messaging = getMessaging(app);
 unsub = onMessage(messaging, (payload) => onNotification(payload));
 })
 .catch(() => {});
 return () => unsub();
}
