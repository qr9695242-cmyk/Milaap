"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { isInAppBrowser } from "@/lib/inAppBrowser";

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [inAppWarning, setInAppWarning] = useState(false);

  useEffect(() => {
    setInAppWarning(isInAppBrowser());
  }, []);

  // Fallback: AuthContext's onAuthStateChanged is more reliable across the
  // Google redirect trip than getRedirectResult() below — if it already
  // picked up the user (and created the profile doc), just navigate home.
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  // Fallback path only — see app/login/page.js for why popup (in
  // handleGoogle below) is now the primary path, with redirect only as a
  // fallback for browsers that block popups.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result || cancelled) return;
        await ensureUserDoc(result.user);
        router.replace("/");
      } catch (err) {
        console.error("Google redirect sign-in failed:", err);
        if (!cancelled) setError(friendlyError(err.code));
      } finally {
        if (!cancelled) setGoogleBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleGoogle() {
    setError("");
    if (isInAppBrowser()) {
      setError(
        "Google sign-in doesn't work inside this in-app browser. Tap the ⋯ / share menu and choose \"Open in Chrome\" or \"Open in Safari\", then try again."
      );
      return;
    }
    setGoogleBusy(true);
    try {
      // Popup avoids the cross-domain redirect trip between our app's
      // domain and Firebase's authDomain (*.firebaseapp.com), which is
      // where getRedirectResult() was silently resolving to null on
      // browsers that partition third-party storage — no error, no
      // account, just landing back on this page.
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(result.user);
      router.replace("/");
    } catch (err) {
      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/operation-not-supported-in-this-environment" ||
        err.code === "auth/popup-closed-by-user"
      ) {
        if (err.code === "auth/popup-closed-by-user") {
          setGoogleBusy(false);
          return;
        }
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // page is navigating away
        } catch (redirectErr) {
          console.error("Google redirect sign-in failed to start:", redirectErr);
          setError(friendlyError(redirectErr.code));
        }
      } else {
        console.error("Google sign-in failed:", err);
        setError(friendlyError(err.code));
      }
      setGoogleBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        displayName: name,
        email,
        avatar: "",
        coins: 0,
        diamonds: 0,
        vipLevel: 0,
        totalRechargedRs: 0,
        familyId: null,
        createdAt: serverTimestamp(),
      });

      router.replace("/");
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-void px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-3xl font-extrabold">
          <span className="glow-text">Create Account</span>
        </h1>
        <p className="mt-2 text-sm text-mist">
          Join the room. Streaming, gifts, and rank await.
        </p>

        <button
          onClick={handleGoogle}
          disabled={googleBusy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-void disabled:opacity-60"
        >
          <GoogleIcon />
          {googleBusy ? "Signing in…" : "Continue with Google"}
        </button>
        {inAppWarning && (
          <p className="mt-2 text-center text-[11px] text-gold">
            ⚠️ You're in an in-app browser — Google sign-in may not work here. Open this link in Chrome/Safari for best results.
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-mist">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSignup} className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-mist">Display name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
              placeholder="Your name"
            />
          </div>
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
            <label className="text-xs text-mist">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
              placeholder="At least 6 characters"
            />
          </div>

          {error && <p className="text-xs text-neon-pink">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist">
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
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
      email: firebaseUser.email || "",
      avatar: firebaseUser.photoURL || "",
      coins: 0,
      diamonds: 0,
      vipLevel: 0,
      totalRechargedRs: 0,
      familyId: null,
      createdAt: serverTimestamp(),
    });
  }
}

function friendlyError(code) {
  const map = {
    "auth/email-already-in-use": "An account already exists with that email.",
    "auth/invalid-email": "That email doesn't look right.",
    "auth/weak-password": "Password is too weak.",
    "auth/popup-closed-by-user": "Google sign-in cancelled.",
    "auth/unauthorized-domain":
      "This site isn't authorized for Google sign-in yet — add it in Firebase Console → Authentication → Settings → Authorized domains.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
