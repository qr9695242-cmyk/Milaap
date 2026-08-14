"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenUserLudoWallet } from "@/lib/ludo";
import { medalsWithStatus } from "@/lib/medals";
import BottomNav from "@/components/BottomNav";

export default function Medal() {
 const { user, profile } = useAuth();
 const [ludoWallet, setLudoWallet] = useState(null);

 useEffect(() => {
 if (!user) return;
 const unsub = listenUserLudoWallet(user.uid, setLudoWallet);
 return () => unsub();
 }, [user?.uid]);

 const medals = medalsWithStatus({ profile, ludoWallet });

 return (
 <main className="min-h-screen bg-void pb-28">
 <header className="px-5 pt-7">
 <Link href="/profile" className="text-ink/70">
 ‹
 </Link>
 <h1 className="mt-2 font-display text-2xl font-black text-ink">🏅 Medal</h1>
 <p className="text-xs text-mist">
 {medals.filter((m) => m.unlocked).length}/{medals.length} unlocked
 </p>
 </header>
 <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
 {medals.map((m) => (
 <div
 key={m.id}
 className={`premium-card p-5 text-center transition ${m.unlocked ? "ring-1 ring-gold/40" : ""}`}
 >
 <div className={`text-4xl ${m.unlocked ? "" : "grayscale opacity-40"}`}>{m.icon}</div>
 <p className="mt-2 text-sm font-bold text-ink">{m.name}</p>
 {m.unlocked ? (
 <p className="mt-1 text-[10px] font-semibold text-gold">Unlocked</p>
 ) : (
 <p className="mt-1 text-[10px] text-mist">{m.description}</p>
 )}
 </div>
 ))}
 </div>
 <BottomNav />
 </main>
 );
}
