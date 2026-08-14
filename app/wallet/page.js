"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

const COINS_PER_DIAMOND = 20000;
const RUPEES_PER_DIAMOND = 4;

export default function WalletPage() {
 const { profile, loading } = useAuth();
 const coins = Number(profile?.coins || 0);
 const diamonds = Number(profile?.diamonds || 0);

 if (loading) {
 return <main className="min-h-screen bg-void text-white grid place-items-center">Loading…</main>;
 }

 return (
 <main className="min-h-screen bg-void px-4 py-8 text-white">
 <section className="mx-auto max-w-xl rounded-3xl bg-[#141824] p-5 ring-1 ring-white/10">
 <h1 className="text-2xl font-black">Milaap Wallet</h1>
 <p className="mt-1 text-xs text-white/50">Profile is the main Diamond wallet.</p>

 <div className="mt-5 grid grid-cols-2 gap-3">
 <div className="rounded-2xl bg-black/20 p-4">
 <p className="text-xs text-white/50">Coins</p>
 <p className="mt-2 text-xl font-black">🪙 {coins.toLocaleString()}</p>
 </div>
 <div className="rounded-2xl bg-black/20 p-4">
 <p className="text-xs text-white/50">Profile Diamonds</p>
 <p className="mt-2 text-xl font-black">💎 {diamonds.toLocaleString()}</p>
 </div>
 </div>

 <div className="mt-4 rounded-2xl bg-white/5 p-4 text-xs text-white/70">
 <p><b className="text-white">Conversion:</b> 20,000 Coins = 1 Diamond</p>
 <p className="mt-1">1 Diamond = Rs. 4 reference value</p>
 <p className="mt-1">Example: 3,520,000 Coins = 176 Diamonds = Rs. 704</p>
 </div>

 <div className="mt-4 flex flex-wrap gap-2">
 <Link href="/profile" className="rounded-xl bg-white px-4 py-3 text-xs font-black text-black">
 Open Profile
 </Link>
 <Link href="/withdrawal" className="rounded-xl bg-white/10 px-4 py-3 text-xs font-black">
 Withdrawal
 </Link>
 </div>
 </section>
 </main>
 );
}
