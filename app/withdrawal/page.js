"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createWithdrawalRequest, RUPEES_PER_DIAMOND, getRupeesPerDiamond } from "@/lib/withdrawal";

export default function WithdrawalPage() {
  const { user, profile, loading } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("JazzCash");
  const [account, setAccount] = useState("");
  const [name, setName] = useState(profile?.displayName || "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [rupeesPerDiamond, setRupeesPerDiamond] = useState(RUPEES_PER_DIAMOND);
  const diamonds = Math.floor(Number(profile?.diamonds || 0));

  useEffect(() => { getRupeesPerDiamond().then(setRupeesPerDiamond).catch(() => {}); }, []);
  const requestedDiamonds = Math.floor(Number(amount || 0));
  const requestedCash = requestedDiamonds * rupeesPerDiamond;

  async function submitWithdrawal(e) {
    e.preventDefault();
    setStatus("");
    if (!user) return setStatus("Please login first.");
    setBusy(true);
    try {
      await createWithdrawalRequest({ uid: user.uid, name, method, account, diamonds: amount });
      setAmount("");
      setStatus("Withdrawal request submitted. Status: Pending Admin Review.");
    } catch (e) {
      setStatus(e?.message || "Withdrawal request failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#090b12] text-white grid place-items-center">Loading…</main>;

  return (
    <main className="min-h-screen bg-[#090b12] px-4 py-6 text-white">
      <section className="mx-auto max-w-xl rounded-3xl bg-[#141824] p-5 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Diamond Withdrawal</h1>
            <p className="mt-1 text-xs text-white/55">Request a payout from your available Diamonds.</p>
          </div>
          <div className="rounded-2xl bg-black/50 px-4 py-3 text-right ring-1 ring-white/10">
            <div className="text-xs text-white/50">Available</div>
            <div className="mt-1 text-xl font-black text-cyan-300">💎 {diamonds.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/[.06] p-4 text-xs text-white/65 ring-1 ring-white/10">
          Cash-out requests are reviewed by the admin. Your Diamonds are reserved immediately when the request is submitted.
        </div>

        <form onSubmit={submitWithdrawal} className="mt-5">
          <label className="mb-2 block text-xs font-bold text-white/75">Withdrawal Method</label>
          <div className="grid grid-cols-3 gap-2">
            {["JazzCash", "Easypaisa", "Bank"].map((item) => (
              <button type="button" key={item} onClick={() => setMethod(item)} className={`rounded-xl px-3 py-3 text-xs font-black ring-1 transition ${method === item ? "bg-white text-black ring-white" : "bg-white/[.06] text-white ring-white/10"}`}>
                {item}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs font-bold text-white/75">Account Holder Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account holder name" className="mt-2 w-full rounded-xl bg-white/[.06] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/35 focus:ring-cyan-300" />

          <label className="mt-4 block text-xs font-bold text-white/75">Account / Wallet Number</label>
          <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Enter account or wallet number" className="mt-2 w-full rounded-xl bg-white/[.06] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/35 focus:ring-cyan-300" />

          <label className="mt-4 block text-xs font-bold text-white/75">Diamonds to Withdraw</label>
          <input type="number" min="1" max={diamonds || 1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Maximum ${diamonds.toLocaleString()}`} className="mt-2 w-full rounded-xl bg-white/[.06] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/35 focus:ring-cyan-300" />

          <div className="mt-2 rounded-xl bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100 ring-1 ring-cyan-300/20">💎 {requestedDiamonds.toLocaleString()} = Rs. {requestedCash.toLocaleString()}</div>

          <button disabled={busy || diamonds < 1 || requestedDiamonds < 1 || requestedDiamonds > diamonds} type="submit" className="mt-5 w-full rounded-xl bg-white py-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? "SUBMITTING…" : "REQUEST WITHDRAWAL"}
          </button>
        </form>

        {status && <div className="mt-4 rounded-xl bg-cyan-400/10 p-3 text-sm text-cyan-100 ring-1 ring-cyan-300/20">{status}</div>}

        <div className="mt-5 rounded-2xl bg-black/20 p-4 text-xs leading-5 text-white/55">
          <b className="text-white/80">Withdrawal Status</b>
          <p className="mt-1">Requests remain Pending until reviewed by an admin.</p>
          <p>Never enter a password, PIN or OTP.</p>
        </div>
      </section>
    </main>
  );
}
