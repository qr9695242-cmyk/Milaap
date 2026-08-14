"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { RECHARGE_PACKAGES, submitRechargeRequest, exchangeDiamondsToCoins } from "@/lib/wallet";
import { SUPPORT_CONFIG } from "@/lib/config";
import { MIN_WITHDRAWAL_DIAMONDS, submitWithdrawalRequest, listenMyWithdrawals } from "@/lib/withdrawals";

export default function WalletPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("wallet");
  const [selectedPack, setSelectedPack] = useState(null);
  const [payMethod, setPayMethod] = useState("JazzCash");
  const [reference, setReference] = useState("");
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("JazzCash");
  const [accountName, setAccountName] = useState("");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);

  const coins = Number(profile?.coins || 0);
  const diamonds = Number(profile?.diamonds || 0);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return undefined;
    return listenMyWithdrawals(user.uid, setWithdrawals, (err) => console.error("withdrawals", err));
  }, [user]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void grid place-items-center text-mist">Loading…</main>;
  }

  async function recharge() {
    if (!selectedPack || !reference.trim()) return;
    setBusy(true); setMessage("");
    try {
      await submitRechargeRequest({ uid: user.uid, name: profile?.displayName || "User", pkg: selectedPack, method: payMethod, reference: reference.trim() });
      setMessage("Recharge request admin review ke liye chali gayi hai.");
      setReference("");
    } catch (e) { setMessage(e.message || "Recharge request submit nahi hui."); }
    finally { setBusy(false); }
  }

  async function exchange() {
    const value = Math.floor(Number(exchangeAmount));
    if (!value) return;
    setBusy(true); setMessage("");
    try {
      const result = await exchangeDiamondsToCoins(user.uid, value);
      setMessage(`${value.toLocaleString()} Diamonds exchange ho gaye. ${result.coinsGained.toLocaleString()} Coins add hue.`);
      setExchangeAmount("");
    } catch (e) { setMessage(e.message || "Exchange nahi hua."); }
    finally { setBusy(false); }
  }

  async function withdraw() {
    const value = Math.floor(Number(withdrawAmount));
    if (value < MIN_WITHDRAWAL_DIAMONDS) { setMessage(`Minimum withdrawal ${MIN_WITHDRAWAL_DIAMONDS.toLocaleString()} Diamonds hai.`); return; }
    if (value > diamonds) { setMessage("Aapke available Diamonds se zyada withdrawal nahi ho sakti."); return; }
    if (!accountName.trim() || !account.trim()) { setMessage("Account holder name aur account/wallet number dono likhein."); return; }
    setBusy(true); setMessage("");
    try {
      await submitWithdrawalRequest({ uid: user.uid, name: profile?.displayName || accountName, diamonds: value, method: withdrawMethod, account, accountName });
      setMessage("Withdrawal request Pending Admin Review mein chali gayi hai.");
      setWithdrawAmount("");
    } catch (e) { setMessage(e.message || "Withdrawal request submit nahi hui."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-void px-4 pb-28 pt-6 text-ink">
      <section className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <div><Link href="/profile" className="text-ink/60">←</Link><h1 className="mt-2 font-display text-2xl font-black">Milaap Wallet</h1><p className="mt-1 text-xs text-mist">Coins aur Diamonds ka main wallet</p></div>
          <div className="rounded-2xl bg-black px-4 py-3 text-right text-white shadow-xl">
            <div className="text-sm font-black">🪙 {coins.toLocaleString()}</div>
            <div className="mt-1 text-sm font-black">💎 {diamonds.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-panel p-2 ring-1 ring-white/10">
          {[['wallet','Wallet'],['recharge','Recharge'],['exchange','Exchange'],['withdraw','Withdraw']].map(([id,label]) => <button key={id} onClick={()=>setTab(id)} className={`rounded-xl py-3 text-xs font-black ${tab===id?'bg-white text-black':'text-mist'}`}>{label}</button>)}
        </div>

        {message && <div className="mt-4 rounded-2xl bg-blue-500/10 p-4 text-sm text-ink ring-1 ring-blue-300/20">{message}</div>}

        {tab === "wallet" && (
          <div className="mt-5 space-y-3">
            <div className="rounded-3xl bg-panel p-5 ring-1 ring-white/10"><p className="text-xs text-mist">Available Coins</p><p className="mt-2 text-3xl font-black">🪙 {coins.toLocaleString()}</p></div>
            <div className="rounded-3xl bg-panel p-5 ring-1 ring-white/10"><p className="text-xs text-mist">Available Diamonds</p><p className="mt-2 text-3xl font-black">💎 {diamonds.toLocaleString()}</p></div>
            <p className="rounded-2xl bg-amber-400/10 p-4 text-xs text-mist ring-1 ring-amber-300/20">Internal exchange aur payout settings public wallet par show nahi hoti.</p>
          </div>
        )}

        {tab === "recharge" && (
          <section className="mt-5">
            <h2 className="font-display text-lg font-black">Recharge Coins</h2>
            <p className="mt-1 text-xs text-mist">Payment admin verify karega, phir coins wallet mein add honge.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {RECHARGE_PACKAGES.map(pkg => <button key={pkg.id} onClick={()=>setSelectedPack(pkg)} className={`rounded-2xl bg-panel p-4 text-left ring-1 ${selectedPack?.id===pkg.id?'ring-diamond':'ring-white/10'}`}><p className="font-black">🪙 {pkg.coins.toLocaleString()}</p>{pkg.bonusCoins>0&&<p className="mt-1 text-[11px] text-emerald-400">+{pkg.bonusCoins.toLocaleString()} bonus</p>}<p className="mt-2 text-xs font-bold text-gold">Rs {pkg.priceRs.toLocaleString()}</p></button>)}
            </div>
            {selectedPack && <div className="mt-5 rounded-3xl bg-panel p-5 ring-1 ring-white/10"><p className="text-xs text-mist">Send Rs {selectedPack.priceRs.toLocaleString()} to:</p><div className="mt-2 rounded-xl bg-black p-3 text-sm font-black text-white">{SUPPORT_CONFIG.paymentMethods.find(x=>x.name===payMethod)?.number}</div><div className="mt-4 flex gap-2">{SUPPORT_CONFIG.paymentMethods.map(m=><button key={m.name} onClick={()=>setPayMethod(m.name)} className={`flex-1 rounded-xl py-3 text-xs font-black ${payMethod===m.name?'bg-white text-black':'bg-white/10'}`}>{m.name}</button>)}</div><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Transaction ID / Reference" className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"/><button disabled={busy||!reference.trim()} onClick={recharge} className="mt-4 w-full rounded-xl bg-white py-4 font-black text-black disabled:opacity-50">{busy?'Submitting…':'I PAID — SUBMIT'}</button></div>}
          </section>
        )}

        {tab === "exchange" && (
          <section className="mt-5 rounded-3xl bg-panel p-5 ring-1 ring-white/10"><h2 className="font-display text-lg font-black">Diamond Exchange</h2><p className="mt-1 text-xs text-mist">Apne Diamonds ko internal Coins mein convert karein.</p><p className="mt-4 text-xs text-mist">Available: 💎 {diamonds.toLocaleString()}</p><input type="number" min="1" max={diamonds} value={exchangeAmount} onChange={e=>setExchangeAmount(e.target.value)} placeholder="Diamonds to exchange" className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"/><button disabled={busy||!exchangeAmount} onClick={exchange} className="mt-4 w-full rounded-xl bg-white py-4 font-black text-black disabled:opacity-50">EXCHANGE DIAMONDS</button></section>
        )}

        {tab === "withdraw" && (
          <section className="mt-5 rounded-3xl bg-white p-5 text-slate-900 shadow-xl">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">Diamond Withdrawal</h2><p className="mt-1 text-sm text-slate-500">Withdrawal-eligible Diamonds</p></div><div className="rounded-2xl bg-black px-4 py-3 text-right font-black text-white">💎 {diamonds.toLocaleString()}</div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{['JazzCash','Easypaisa','Bank'].map(m=><button key={m} onClick={()=>setWithdrawMethod(m)} className={`rounded-xl border-2 py-3 text-xs font-black ${withdrawMethod===m?'border-black bg-black text-white':'border-slate-200 bg-white'}`}>{m}</button>)}</div>
            <label className="mt-5 block text-sm font-bold">Account Holder Name</label><input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Account holder name" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"/>
            <label className="mt-4 block text-sm font-bold">Account / Wallet Number</label><input value={account} onChange={e=>setAccount(e.target.value)} placeholder="Enter account or wallet number" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"/>
            <label className="mt-4 block text-sm font-bold">Diamonds to Withdraw</label><input type="number" min={MIN_WITHDRAWAL_DIAMONDS} max={diamonds} value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder={`Minimum ${MIN_WITHDRAWAL_DIAMONDS.toLocaleString()}`} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"/>
            <p className="mt-2 text-xs text-slate-500">Minimum withdrawal: {MIN_WITHDRAWAL_DIAMONDS.toLocaleString()} Diamonds. Payout calculation public screen par show nahi hoti.</p>
            <button disabled={busy||Number(withdrawAmount)<MIN_WITHDRAWAL_DIAMONDS||Number(withdrawAmount)>diamonds} onClick={withdraw} className="mt-5 w-full rounded-xl bg-black py-4 text-lg font-black text-white disabled:opacity-40">{busy?'Submitting…':'REQUEST WITHDRAWAL'}</button>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600"><b>Withdrawal Status</b><p className="mt-1">Request admin review ke baad process hogi.</p></div>
            {withdrawals.length>0 && <div className="mt-5"><h3 className="text-sm font-black">My Requests</h3><div className="mt-2 space-y-2">{withdrawals.slice(0,5).map(r=><div key={r.id} className="rounded-xl border border-slate-200 p-3 text-xs"><div className="flex justify-between"><b>{r.diamonds.toLocaleString()} Diamonds</b><span className="font-bold uppercase">{r.status}</span></div><p className="mt-1 text-slate-500">{r.method} · {r.account}</p></div>)}</div></div>}
          </section>
        )}
      </section>
    </main>
  );
}
