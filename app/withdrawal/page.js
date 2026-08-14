"use client";

import { useEffect, useState } from "react";
import { httpsCallable, getFunctions } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const COINS_PER_DIAMOND = 20000;
const RUPEES_PER_DIAMOND = 4;
const MIN_DIAMONDS = 1000;

export default function WithdrawalPage() {
  const [profile, setProfile] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("JazzCash");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
    });
  }, []);

  const diamonds = Math.floor(Number(profile?.withdrawableDiamonds ?? profile?.diamonds ?? 0));
  const coins = Math.floor(Number(profile?.coins || 0));

  async function submitWithdrawal(e) {
    e.preventDefault();
    setStatus("");
    const value = Math.floor(Number(amount));

    if (!auth.currentUser) return setStatus("Please login first.");
    if (!value || value < MIN_DIAMONDS) return setStatus(`Minimum withdrawal is ${MIN_DIAMONDS} Diamonds.`);
    if (value > diamonds) return setStatus("Insufficient withdrawal-eligible Diamonds.");
    if (!account.trim() || !name.trim()) return setStatus("Account holder name and account number are required.");
    if (profile?.kycStatus !== "verified") return setStatus("KYC verification is required before withdrawal.");

    setBusy(true);
    try {
      const fn = httpsCallable(getFunctions(auth.currentUser.app), "requestWithdrawal");
      const result = await fn({
        diamonds: value,
        method,
        accountName: name.trim(),
        account: account.trim(),
      });
      setStatus(`Withdrawal submitted. Request ID: ${result.data.requestId}. Status: Pending Admin Review.`);
      setAmount("");
    } catch (err) {
      setStatus(err?.message || "Withdrawal failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-void px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl premium-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Diamond Withdrawal</h1>
            <p className="mt-1 text-xs text-mist">Cash-out is limited to verified host earnings.</p>
          </div>
          <div className="rounded-2xl bg-panel2 px-4 py-3 text-right text-sm font-bold">
            💎 {diamonds.toLocaleString()}
            <div className="text-xs text-mist">Rs. {(diamonds * RUPEES_PER_DIAMOND).toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-panel2 p-4 text-xs">
          <div><b>Wallet</b><span className="ml-2 text-mist">🪙 {coins.toLocaleString()} Coins</span></div>
          <div><b>Rate</b><span className="ml-2 text-mist">{COINS_PER_DIAMOND.toLocaleString()} Coins = 1 Diamond · 1 Diamond = Rs. {RUPEES_PER_DIAMOND}</span></div>
          <div><b>Minimum</b><span className="ml-2 text-mist">{MIN_DIAMONDS.toLocaleString()} Diamonds</span></div>
        </div>

        {profile?.kycStatus !== "verified" && (
          <div className="mt-4 rounded-2xl bg-amber-500/10 p-4 text-xs text-amber-200">
            <b>KYC required.</b> Admin must verify your identity before cash withdrawal is enabled.
          </div>
        )}

        <form onSubmit={submitWithdrawal} className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {["JazzCash", "Easypaisa", "Bank"].map((item) => (
              <button type="button" key={item} onClick={() => setMethod(item)}
                className={`rounded-xl px-3 py-3 text-xs font-bold ring-1 ${method === item ? "bg-ink text-void ring-ink" : "bg-panel2 text-ink ring-white/10"}`}>
                {item}
              </button>
            ))}
          </div>
          <input className="w-full rounded-xl bg-panel2 p-3 text-sm outline-none ring-1 ring-white/10" value={name} onChange={e => setName(e.target.value)} placeholder="Account holder name" />
          <input className="w-full rounded-xl bg-panel2 p-3 text-sm outline-none ring-1 ring-white/10" value={account} onChange={e => setAccount(e.target.value)} placeholder="Wallet / bank account number" />
          <input className="w-full rounded-xl bg-panel2 p-3 text-sm outline-none ring-1 ring-white/10" type="number" min={MIN_DIAMONDS} max={diamonds} value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Diamonds (min ${MIN_DIAMONDS})`} />
          <button disabled={busy || profile?.kycStatus !== "verified"} className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-black text-void disabled:opacity-50">
            {busy ? "Submitting…" : "REQUEST WITHDRAWAL"}
          </button>
        </form>

        {status && <div className="mt-4 rounded-xl bg-panel2 p-3 text-xs">{status}</div>}

        <div className="mt-5 rounded-2xl bg-panel2 p-4 text-xs text-mist">
          <b className="text-ink">Important:</b> Purchased Coins and game-entry Coins are not cashable.
          Only withdrawal-eligible host earnings can be withdrawn. Never enter an OTP, PIN or password.
        </div>
      </div>
    </main>
  );
}
