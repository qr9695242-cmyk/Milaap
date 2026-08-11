"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-void px-6">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/login" className="text-lg text-ink/80">←</Link>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">
          Reset Password
        </h1>
        <p className="mt-2 text-sm text-mist">
          Apni email dalein, hum aapko reset link bhej denge.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-panel p-4 text-sm text-ink ring-1 ring-white/10">
            ✅ Reset link <span className="font-semibold">{email}</span> par
            bhej diya gaya hai. Apna inbox (aur spam folder) check karein.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            {error && <p className="text-xs text-neon-pink">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-mist">
          <Link href="/login" className="text-ink underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

function friendlyError(code) {
  const map = {
    "auth/invalid-email": "That email doesn't look right.",
    "auth/user-not-found": "No account found with that email.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
