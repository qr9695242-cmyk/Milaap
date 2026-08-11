"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { submitWithdrawRequest, diamondsToRs } from "@/lib/wallet";
import { MIN_WITHDRAW_DIAMONDS } from "@/lib/config";

export default function WithdrawPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [diamonds, setDiamonds] = useState("");
  const [method, setMethod] = useState("JazzCash");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const available = profile?.diamonds ?? 0;
  const amount = Number(diamonds) || 0;
  const payoutRs = diamondsToRs(amount);
  const canSubmit =
    amount >= MIN_WITHDRAW_DIAMONDS && amount <= available && accountNumber.trim().length > 0;

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      await submitWithdrawRequest({
        uid: user.uid,
        name: profile?.displayName || "User",
        diamonds: amount,
        method,
        accountNumber,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-4 font-display text-lg font-extrabold text-ink">
          Withdraw Request Bhej Di Gayi
        </h1>
        <p className="mt-2 text-sm text-mist">
          {amount} diamonds (Rs {payoutRs}) ki request admin ko bhej di gayi hai.
          Approve hote hi payment {method} par bhej di jayegi.
        </p>
        <button
          onClick={() => router.push("/wallet")}
          className="mt-6 rounded-full bg-glow-gradient px-5 py-3 text-sm font-semibold text-ink"
        >
          Back to Wallet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void px-5 pb-16 pt-6">
      <Link href="/wallet" className="text-lg text-ink/80">←</Link>
      <h1 className="mt-2 font-display text-xl font-extrabold text-ink">
        Withdraw Diamonds
      </h1>
      <p className="mt-1 text-xs text-mist">
        Available: ◆ {available} diamonds · Rate: 1 diamond ≈ Rs 3 · Minimum{" "}
        {MIN_WITHDRAW_DIAMONDS} diamonds
      </p>

      <section className="mt-5">
        <label className="text-xs font-semibold text-mist">
          Kitne diamonds withdraw karne hain?
        </label>
        <input
          type="number"
          value={diamonds}
          onChange={(e) => setDiamonds(e.target.value)}
          placeholder={`e.g. ${MIN_WITHDRAW_DIAMONDS}`}
          className="mt-2 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
        />
        {amount > 0 && (
          <p className="mt-2 text-xs text-gold">You'll receive: Rs {payoutRs}</p>
        )}
        {amount > available && (
          <p className="mt-1 text-xs text-neon-pink">
            Itni diamonds available nahi hain.
          </p>
        )}
        {amount > 0 && amount < MIN_WITHDRAW_DIAMONDS && (
          <p className="mt-1 text-xs text-neon-pink">
            Minimum {MIN_WITHDRAW_DIAMONDS} diamonds chahiye withdraw karne ke liye.
          </p>
        )}
      </section>

      <section className="mt-6">
        <p className="text-xs font-semibold text-mist">Payment method</p>
        <div className="mt-3 flex gap-2">
          {["JazzCash", "Easypaisa"].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                method === m
                  ? "bg-white text-void"
                  : "bg-panel text-ink ring-1 ring-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-xs text-mist">
            Aapka {method} account number
          </label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="03XXXXXXXXX"
            className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
          />
        </div>

        {error && <p className="mt-3 text-xs text-neon-pink">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || busy}
          className="mt-5 w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Request Withdraw"}
        </button>
        <p className="mt-2 text-center text-[11px] text-mist">
          Diamonds turant deduct ho jayengi. Admin approve karke aapko{" "}
          {method} par payment bhej dega.
        </p>
      </section>
    </main>
  );
}
