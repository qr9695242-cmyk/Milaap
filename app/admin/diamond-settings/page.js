"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DIAMOND_TO_COIN_RATE, MILAAP_ECONOMY } from "@/lib/config";

const SETTINGS_REF = doc(db, "config", "diamondSettings");

export default function AdminDiamondSettingsPage() {
 const [coinsPerDiamond, setCoinsPerDiamond] = useState(DIAMOND_TO_COIN_RATE);
 const [rupeesPerDiamond, setRupeesPerDiamond] = useState(1);
 const [saved, setSaved] = useState(false);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  getDoc(SETTINGS_REF).then((snap) => {
   if (snap.exists()) {
    const data = snap.data();
    if (Number(data.coinsPerDiamond) > 0) setCoinsPerDiamond(Number(data.coinsPerDiamond));
    if (Number(data.rupeesPerDiamond) > 0) setRupeesPerDiamond(Number(data.rupeesPerDiamond));
   }
  }).finally(() => setLoading(false));
 }, []);

 async function saveSettings(e) {
  e.preventDefault();
  const data = { coinsPerDiamond: Number(coinsPerDiamond) || DIAMOND_TO_COIN_RATE, rupeesPerDiamond: Number(rupeesPerDiamond) || 1, updatedAt: serverTimestamp() };
  await setDoc(SETTINGS_REF, data, { merge: true });
  await setDoc(doc(db, "config", "exchangeRate"), { rate: data.coinsPerDiamond, updatedAt: serverTimestamp() }, { merge: true });
  setCoinsPerDiamond(data.coinsPerDiamond);
  setRupeesPerDiamond(data.rupeesPerDiamond);
  setSaved(true);
  setTimeout(() => setSaved(false), 2500);
 }

 return (
 <main className="min-h-screen bg-[#f4f5f7] p-5">
  <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-black">Diamond Settings</h1><p className="mt-1 text-sm text-black/50">Admin-only economy source of truth</p></div><div className="rounded-2xl bg-black px-4 py-3 text-sm font-black text-white">💎 Admin</div></div>
   {loading ? <p className="mt-6 text-sm text-black/50">Loading settings…</p> : <form onSubmit={saveSettings} className="mt-6 space-y-5">
    <div><label className="mb-2 block text-sm font-bold text-black">Coins per 1 Diamond (Exchange)</label><input type="number" min="1" value={coinsPerDiamond} onChange={(e)=>setCoinsPerDiamond(e.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 text-black outline-none"/></div>
    <div><label className="mb-2 block text-sm font-bold text-black">Rupees per 1 Diamond (Withdrawal)</label><input type="number" min="0.01" step="0.01" value={rupeesPerDiamond} onChange={(e)=>setRupeesPerDiamond(e.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 text-black outline-none"/></div>
    <div className="rounded-2xl bg-[#f7f7f7] p-4 text-sm text-black/70"><b>Gift earning:</b> {Number(MILAAP_ECONOMY.giftCoinsPerDiamond).toLocaleString()} gift Coins = 1 Diamond<br/><b>Exchange:</b> {Number(coinsPerDiamond).toLocaleString()} Coins = 1 Diamond<br/><b>Withdrawal:</b> 1 Diamond = Rs. {Number(rupeesPerDiamond).toLocaleString()}</div>
    <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 font-black text-white">SAVE DIAMOND SETTINGS</button>
    {saved && <div className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">Diamond settings saved for the whole app.</div>}
   </form>}
  </section>
 </main>
 );
}
