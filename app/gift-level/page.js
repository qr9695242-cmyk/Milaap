"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { GIFT_LEVELS, giftLevelForCoins, nextGiftLevel, formatCompactCoins } from "@/lib/giftLevel";
import BottomNav from "@/components/BottomNav";

export default function GiftLevelPage() {
 const { user, profile, loading } = useAuth();
 const router = useRouter();

 useEffect(() => {
 if (!loading && !user) router.replace("/login");
 }, [loading, user, router]);

 const gifted = profile?.totalCoinsGifted ?? 0;
 const current = giftLevelForCoins(gifted);
 const next = nextGiftLevel(gifted);
 const progressPct = next
 ? Math.round(((gifted - current.minCoins) / (next.minCoins - current.minCoins)) * 100)
 : 100;

 const [selectedLevel, setSelectedLevel] = useState(current.level);
 const selected = GIFT_LEVELS[selectedLevel] || current;

 // Skip the "No Level" placeholder for the grid — that's only shown in the hero.
 const paidTiers = useMemo(() => GIFT_LEVELS.filter((t) => t.level > 0), []);

 if (loading || !user) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-void">
 <p className="text-mist text-sm">Loading…</p>
 </main>
 );
 }

 return (
 <main className="min-h-screen bg-void pb-28">
 <section
 className="relative overflow-hidden px-5 pb-8 pt-10"
 style={{ background: `linear-gradient(160deg, ${current.color}66, #0B0713 75%)` }}
 >
 {/* decorative glow blobs */}
 <div
 className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
 style={{ backgroundColor: current.color }}
 />
 <div
 className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full opacity-20 blur-3xl"
 style={{ backgroundColor: current.color }}
 />

 <Link href="/profile" className="relative text-lg text-ink/80">←</Link>

 <div className="relative mt-4 flex items-center gap-4">
 <div
 className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-4xl ring-2 ${current.glow}`}
 style={{
 background: `radial-gradient(circle at 35% 30%, ${current.color}55, #14101F 70%)`,
 borderColor: current.color,
 boxShadow: `0 0 30px -6px ${current.color}aa`,
 }}
 >
 {current.icon}
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-wider text-mist">{current.band} · Your gift level</p>
 <h1
 className="font-display text-2xl font-extrabold"
 style={{ color: current.color, textShadow: `0 0 18px ${current.color}88` }}
 >
 Lv.{current.level} {current.name}
 </h1>
 </div>
 </div>

 <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/10 backdrop-blur-sm">
 <span className="text-diamond">●</span>
 <p className="text-xs text-ink/90">
 <span className="font-bold">{formatCompactCoins(gifted)}</span> coins gifted (lifetime)
 </p>
 </div>

 {next ? (
 <div className="relative mt-4">
 <div className="h-2.5 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10">
 <div
 className="h-full rounded-full transition-all"
 style={{
 width: `${progressPct}%`,
 background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
 boxShadow: `0 0 12px -2px ${next.color}`,
 }}
 />
 </div>
 <p className="mt-1.5 text-[11px] text-mist">
 <span className="font-semibold text-ink/80">{formatCompactCoins(next.minCoins - gifted)} coins</span> ka
 gift aur bhejna hai Lv.{next.level} {next.icon} ke liye
 </p>
 </div>
 ) : (
 <p className="relative mt-4 text-[11px] font-semibold text-ink/90">🔥 Max gift level reached — aap sab se aage hain!</p>
 )}
 </section>

 {/* Selected level detail card — updates as you tap any badge below */}
 <section className="mx-5 mt-4">
 <div
 className={`relative overflow-hidden rounded-2xl p-4 ring-1 ${selected.glow}`}
 style={{
 background: `linear-gradient(135deg, ${selected.color}33, #14101F)`,
 borderColor: selected.color,
 }}
 >
 <div
 className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl"
 style={{ backgroundColor: selected.color }}
 />
 <div className="relative flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div
 className="flex h-11 w-11 items-center justify-center rounded-full text-xl ring-1"
 style={{ backgroundColor: `${selected.color}22`, borderColor: selected.color }}
 >
 {selected.icon}
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-wide text-mist">{selected.band}</p>
 <p className="font-display text-lg font-extrabold" style={{ color: selected.color }}>
 Lv.{selected.level} {selected.name}
 </p>
 </div>
 </div>
 {selected.level === current.level ? (
 <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-ink">Current</span>
 ) : selected.level < current.level ? (
 <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-mist">Unlocked</span>
 ) : (
 <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-mist">🔒 Locked</span>
 )}
 </div>
 <p className="relative mt-2 text-xs text-mist">{formatCompactCoins(selected.minCoins)}+ coins gifted (lifetime)</p>
 </div>
 </section>

 {/* Full 1–200 level path in one grid — each badge gets more premium as it climbs */}
 <section className="mx-5 mt-6">
 <div className="grid grid-cols-8 gap-2">
 {paidTiers.map((tier) => {
 const unlocked = tier.level <= current.level;
 const isCurrent = tier.level === current.level;
 return (
 <button
 key={tier.level}
 onClick={() => setSelectedLevel(tier.level)}
 className={`aspect-square rounded-lg text-[10px] font-bold ring-1 transition ${
 isCurrent
 ? "ring-2"
 : selectedLevel === tier.level
 ? "ring-white/40"
 : "ring-white/5"
 } ${unlocked ? tier.glow : "opacity-35"}`}
 style={{
 backgroundColor: unlocked ? `${tier.color}33` : "#1A1626",
 color: unlocked ? tier.color : "#5C5570",
 borderColor: isCurrent ? tier.color : undefined,
 }}
 >
 {tier.level}
 </button>
 );
 })}
 </div>
 </section>

 <BottomNav />
 </main>
 );
}
