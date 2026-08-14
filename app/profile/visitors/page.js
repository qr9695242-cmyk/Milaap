"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenVisitors } from "@/lib/visitors";
import { vipLevelForSpend } from "@/lib/vip";
import BottomNav from "@/components/BottomNav";
import PremiumCard from "@/components/PremiumCard";

const REQUIRED_VIP_LEVEL = 1; // "SVIP1" in SVIP Settings → Honorary privileges

export default function VisitorsPage() {
 const { user, profile, loading } = useAuth();
 const router = useRouter();
 const [visitors, setVisitors] = useState([]);

 useEffect(() => {
 if (!loading && !user) router.replace("/login");
 }, [loading, user, router]);

 useEffect(() => {
 if (!user) return;
 const unsub = listenVisitors(user.uid, setVisitors);
 return () => unsub();
 }, [user]);

 if (loading || !user) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-void">
 <p className="text-mist text-sm">Loading…</p>
 </main>
 );
 }

 const vipTier = vipLevelForSpend(profile?.totalRechargedRs);
 const unlocked = vipTier.level >= REQUIRED_VIP_LEVEL;

 return (
 <main className="min-h-screen bg-void pb-28">
 <header className="flex items-center gap-3 px-5 pt-6">
 <Link href="/vip/settings" className="text-lg text-ink/80">←</Link>
 <h1 className="font-display text-lg font-extrabold text-ink">Who Visited My Profile</h1>
 </header>

 {!unlocked ? (
 <PremiumCard className="mx-5 mt-6 p-6 text-center">
 <p className="text-3xl">🔒</p>
 <p className="mt-3 text-sm font-semibold text-ink">SVIP {REQUIRED_VIP_LEVEL} required</p>
 <p className="mt-1 text-xs text-mist">
 Yeh privilege VIP {REQUIRED_VIP_LEVEL}+ ke liye hai. Aap abhi {vipTier.name} par hain.
 </p>
 <Link href="/vip" className="premium-btn mt-4 inline-block !px-5 !py-2.5">
 Upgrade SVIP
 </Link>
 </PremiumCard>
 ) : visitors.length === 0 ? (
 <p className="mx-5 mt-6 text-center text-xs text-mist">
 Abhi tak koi visit record nahi hai.
 </p>
 ) : (
 <div className="mx-5 mt-5 space-y-2">
 {visitors.map((v) => (
 <Link key={v.id} href={`/u/${v.uid}`}>
 <PremiumCard className="flex items-center gap-3 p-3">
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-ink ring-1 ring-white/20">
 {(v.name || "U").charAt(0).toUpperCase()}
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-ink">{v.name}</p>
 <p className="text-[10px] text-mist">
 {v.vipLevel > 0 ? `VIP ${v.vipLevel}` : "No VIP"}
 </p>
 </div>
 <span className="text-mist">›</span>
 </PremiumCard>
 </Link>
 ))}
 </div>
 )}

 <BottomNav />
 </main>
 );
}
