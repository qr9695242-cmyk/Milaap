import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initializing on hot reload / multiple imports
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Force the most durable persistence available (IndexedDB, falling back to
// localStorage) as early as possible. Without this, some mobile browsers
// and in-app webviews (WhatsApp/Instagram/TikTok embedded browser) drop the
// pending-redirect state on the trip to Google and back, so
// getRedirectResult() silently resolves to null — no error, no account.
// This doesn't fully fix in-app-webview blocks (see the browser check in
// app/login and app/signup), but it fixes it for normal mobile Safari/Chrome.
if (typeof window !== "undefined") {
  setPersistence(auth, indexedDBLocalPersistence).catch(() =>
    setPersistence(auth, browserLocalPersistence).catch(() => {})
  );
}

export default app;
