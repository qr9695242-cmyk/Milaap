import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// If the NEXT_PUBLIC_FIREBASE_* env vars aren't set on the deploy platform
// (Vercel Project Settings -> Environment Variables), apiKey etc. come
// through as undefined. Calling initializeApp/getAuth with that config
// throws immediately (auth/invalid-api-key) and, since this module is
// imported by AuthContext which almost every page pulls in, it takes down
// prerendering for the ENTIRE build, not just one page. We fall back to a
// harmless placeholder config during build/prerender so the build itself
// can finish; real auth will still fail at runtime until the real env vars
// are set in Vercel — that part can't be fixed from code.
const hasRealConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

if (!hasRealConfig && typeof window === "undefined") {
  console.warn(
    "[firebase] NEXT_PUBLIC_FIREBASE_* env vars are missing at build time. " +
      "Set them in Vercel -> Project Settings -> Environment Variables " +
      "(for Production, Preview, and Development) or Firebase Auth will not work."
  );
}

const safeConfig = hasRealConfig
  ? firebaseConfig
  : {
      apiKey: "build-placeholder-key",
      authDomain: "build-placeholder.firebaseapp.com",
      projectId: "build-placeholder",
      storageBucket: "build-placeholder.appspot.com",
      messagingSenderId: "0",
      appId: "1:0:web:0000000000000000000000",
    };

// Avoid re-initializing on hot reload / multiple imports
export const app = getApps().length ? getApp() : initializeApp(safeConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics only works in the browser (reads window/document) and needs a
// real measurementId, so: never touch it during server-side build/prerender,
// and use isSupported() to skip gracefully in browsers that block it
// (Safari private mode, ad-blockers, in-app webviews, etc). `analytics`
// stays null until (and unless) it's ready — always check before using it.
export let analytics = null;
if (typeof window !== "undefined" && hasRealConfig && firebaseConfig.measurementId) {
  isAnalyticsSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {});
}

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
