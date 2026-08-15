"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { getExchangeRate } from "@/lib/exchangeRate";
import { DIAMOND_TO_COIN_RATE } from "@/lib/config";

const EXCHANGE_RATE = DIAMOND_TO_COIN_RATE;

export default function WalletPage() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState("wallet");
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(EXCHANGE_RATE);
  const coins = Number(profile?.coins || 0);
  const diamonds = Number(profile?.diamonds || 0);

  useEffect(() => {
    getExchangeRate().then((rate) => { if (Number(rate) > 0) setExchangeRate(Number(rate)); }).catch(() => {});
  }, []);

  async function exchangeDiamonds() {
    setMessage("");
    if (!user) return setMessage("Please login first.");
    const amount = Math.floor(Number(exchangeAmount));
    if (!Number.isFinite(amount) || amount < 1) return setMessage("Enter Diamonds to exchange.");
    setBusy(true);
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, "users", user.uid);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("User profile not found.");
        const currentDiamonds = Math.floor(Number(snap.data()?.diamonds || 0));
        const currentCoins = Math.floor(Number(snap.data()?.coins || 0));
        if (amount > currentDiamonds) throw new Error("Insufficient Diamonds.");
        tx.update(ref, { diamonds: currentDiamonds - amount, coins: currentCoins + amount * exchangeRate, updatedAt: serverTimestamp() });
      });
      setExchangeAmount("");
      setMessage("Exchange completed successfully.");
    } catch (e) {
      setMessage(e?.message || "Exchange failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-void text-white grid place-items-center">Loading…</main>;

  const tabs = [
    ["wallet", "Wallet"],
    ["recharge", "Purchase"],
    ["exchange", "Exchange"],
    ["withdraw", "Withdrawal"],
  ];

  return (
    <main className="min-h-screen bg-void px-4 py-6 pb-24 text-white">
      <section className="mx-auto max-w-xl">
        <div className="flex items-end justify-between gap-3">
          <div><h1 className="text-2xl font-black">Milaap Wallet</h1><p className="mt-1 text-xs text-white/45">Your wallet, purchase, exchange and withdrawal.</p></div>
          <div className="rounded-2xl bg-black/40 px-3 py-2 text-right text-xs ring-1 ring-white/10"><div>🪙 {coins.toLocaleString()}</div><div className="mt-1 text-cyan-300">💎 {diamonds.toLocaleString()}</div></div>
        </div>

        <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-2xl bg-[#141824] ring-1 ring-white/10">
          {tabs.map(([id, label]) => <button key={id} onClick={() => { setTab(id); setMessage(""); }} className={`px-2 py-3 text-[11px] font-black ${tab === id ? "bg-white text-black" : "text-white/65"}`}>{label}</button>)}
        </div>

        {tab === "wallet" && <div className="mt-4 grid gap-3"><BalanceCard label="Available Coins" value={`🪙 ${coins.toLocaleString()}`} /><BalanceCard label="Available Diamonds" value={`💎 ${diamonds.toLocaleString()}`} /></div>}

        {tab === "recharge" && <div className="mt-4 rounded-3xl bg-[#141824] p-5 ring-1 ring-white/10"><h2 className="text-lg font-black">Purchase Coins</h2><p className="mt-1 text-xs text-white/50">Choose a package and submit your recharge request.</p><Link href="/wallet/recharge" className="mt-5 block rounded-xl bg-white py-4 text-center text-sm font-black text-black">OPEN PURCHASE</Link></div>}

        {tab === "exchange" && <div className="mt-4 rounded-3xl bg-[#141824] p-5 ring-1 ring-white/10"><h2 className="text-lg font-black">Exchange</h2><p className="mt-1 text-xs text-white/50">Convert available Diamonds into Coins. The current conversion is applied automatically.</p><label className="mt-5 block text-xs font-bold text-white/70">Diamonds</label><input type="number" min="1" max={diamonds || 1} value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)} placeholder="Enter amount" className="mt-2 w-full rounded-xl bg-white/[.06] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/35" /><button onClick={exchangeDiamonds} disabled={busy || diamonds < 1} className="mt-4 w-full rounded-xl bg-white py-4 text-sm font-black text-black disabled:opacity-40">{busy ? "EXCHANGING…" : "EXCHANGE"}</button>{message && <p className="mt-3 rounded-xl bg-cyan-400/10 p-3 text-xs text-cyan-100">{message}</p>}</div>}

        {tab === "withdraw" && <div className="mt-4 rounded-3xl bg-[#141824] p-5 ring-1 ring-white/10"><h2 className="text-lg font-black">Withdrawal</h2><p className="mt-1 text-xs text-white/50">Request a payout from your available Diamonds.</p><Link href="/withdrawal" className="mt-5 block rounded-xl bg-white py-4 text-center text-sm font-black text-black">OPEN WITHDRAWAL</Link></div>}
      </section>
    </main>
  );
}

function BalanceCard({ label, value }) { return <div className="rounded-3xl bg-[#141824] p-5 ring-1 ring-white/10"><div className="text-xs text-white/50">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></div>; }
