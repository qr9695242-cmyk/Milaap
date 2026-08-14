"use client";

import { useEffect, useState } from "react";

export default function AdminDiamondSettingsPage() {
 const [coinsPerDiamond, setCoinsPerDiamond] = useState(20000);
 const [rupeesPerDiamond, setRupeesPerDiamond] = useState(4);
 const [saved, setSaved] = useState(false);

 useEffect(() => {
 try {
 const raw = localStorage.getItem("milaap_admin_diamond_settings");
 if (raw) {
 const data = JSON.parse(raw);
 if (Number(data.coinsPerDiamond) > 0) setCoinsPerDiamond(Number(data.coinsPerDiamond));
 if (Number(data.rupeesPerDiamond) > 0) setRupeesPerDiamond(Number(data.rupeesPerDiamond));
 }
 } catch {}
 }, []);

 function saveSettings(e) {
 e.preventDefault();

 const data = {
 coinsPerDiamond: Number(coinsPerDiamond) || 20000,
 rupeesPerDiamond: Number(rupeesPerDiamond) || 4,
 updatedAt: new Date().toISOString(),
 };

 localStorage.setItem("milaap_admin_diamond_settings", JSON.stringify(data));
 setCoinsPerDiamond(data.coinsPerDiamond);
 setRupeesPerDiamond(data.rupeesPerDiamond);
 setSaved(true);
 setTimeout(() => setSaved(false), 2500);
 }

 return (
 <main className="min-h-screen bg-[#f4f5f7] p-5">
 <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-black text-black">Diamond Settings</h1>
 <p className="mt-1 text-sm text-black/50">
 Admin-only conversion settings
 </p>
 </div>
 <div className="rounded-2xl bg-black px-4 py-3 text-sm font-black text-white">
 💎 Admin
 </div>
 </div>

 <form onSubmit={saveSettings} className="mt-6 space-y-5">
 <div>
 <label className="mb-2 block text-sm font-bold text-black">
 Coins per 1 Diamond
 </label>
 <input
 type="number"
 min="1"
 value={coinsPerDiamond}
 onChange={(e) => setCoinsPerDiamond(e.target.value)}
 className="w-full rounded-xl border border-black/10 px-4 py-3 text-black outline-none"
 />
 </div>

 <div>
 <label className="mb-2 block text-sm font-bold text-black">
 Reference Rupees per Diamond
 </label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={rupeesPerDiamond}
 onChange={(e) => setRupeesPerDiamond(e.target.value)}
 className="w-full rounded-xl border border-black/10 px-4 py-3 text-black outline-none"
 />
 </div>

 <div className="rounded-2xl bg-[#f7f7f7] p-4 text-sm text-black/70">
 <b>Current rule:</b>{" "}
 {Number(coinsPerDiamond).toLocaleString()} Coins = 1 Diamond
 <br />
 <b>Reference value:</b> 1 Diamond = Rs.{" "}
 {Number(rupeesPerDiamond).toLocaleString()}
 </div>

 <button
 type="submit"
 className="w-full rounded-xl bg-black px-4 py-3 font-black text-white"
 >
 SAVE DIAMOND SETTINGS
 </button>

 {saved && (
 <div className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
 Diamond settings saved.
 </div>
 )}
 </form>

 <p className="mt-5 text-xs text-black/40">
 This admin page controls the displayed conversion configuration.
 Connect it to your authenticated server/Firebase admin settings
 before using it as a production-wide source of truth.
 </p>
 </section>
 </main>
 );
}
