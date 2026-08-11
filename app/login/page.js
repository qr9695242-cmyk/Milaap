"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { isInAppBrowser } from "@/lib/inAppBrowser";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [inAppWarning, setInAppWarning] = useState(false);

  useEffect(() => {
    setInAppWarning(isInAppBrowser());
  }, []);

  // Firebase AuthContext is the single source of truth after login.
  // When Firebase reports a signed-in user, leave the login page.
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch (err) {
      console.error("Email sign-in failed:", err);
      setError(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");

    if (isInAppBrowser()) {
      setError(
        'Google sign-in does not work reliably inside an in-app browser. Open this site in Chrome or Safari and try again.'
      );
      return;
    }

    setGoogleBusy(true);

    try {
      // IMPORTANT: Use popup only. Do not fall back to signInWithRedirect.
      // Redirect can send the browser to Firebase's auth handler and, on
      // some Vercel/domain configurations, return a 404 instead of Milaap.
      const result = await signInWithPopup(auth, googleProvider);

      // Create the user's Firestore profile if it does not exist yet.
      await ensureUserDoc(result.user);

      // Firebase auth state is now established. Go directly to the app.
      router.replace("/");
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError(friendlyError(err.code));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-void px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-3xl font-extrabold">
          <span className="glow-text">Milaap</span>
        </h1>

        <p className="mt-2 text-sm text-mist">
          Sign in to go live, join rooms, and battle.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleBusy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-void disabled:opacity-60"
        >
          <GoogleIcon />
          {googleBusy ? "Signing in…" : "Continue with Google"}
        </button>

        {inAppWarning && (
          <p className="mt-2 text-center text-[11px] text-gold">
            ⚠️ You&apos;re in an in-app browser. Open this link in Chrome/Safari
            for Google sign-in.
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-mist">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-mist">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-mist">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-neon-violet underline"
              >
                Forgot password?
              </Link>
            </div>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-neon-pink">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist">
          New here?{" "}
          <Link href="/signup" className="text-ink underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

async function ensureUserDoc(firebaseUser) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "User",
      displayNameLower: (firebaseUser.displayName || "User").toLowerCase(),
      email: firebaseUser.email || "",
      avatar: firebaseUser.photoURL || "",
      coins: 0,
      diamonds: 0,
      totalRechargedRs: 0,
      vipLevel: 0,
      role: "user",
      familyId: null,
      followersCount: 0,
      followingCount: 0,
      createdAt: serverTimestamp(),
    });
  }
}

function friendlyError(code) {
  const map = {
    "auth/invalid-email": "That email doesn't look right.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked":
      "Your browser blocked the Google popup. Allow popups for this site and try again.",
    "auth/unauthorized-domain":
      "This site is not authorized for Google sign-in. Add the Vercel domain in Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/account-exists-with-different-credential":
      "This email already has another sign-in method. Sign in with that method first, then link Google from the account settings.",
  };

  return map[code] || "Something went wrong. Please try again.";
}
