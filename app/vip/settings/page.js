"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { vipLevelForSpend } from "@/lib/vip";
import PremiumCard from "@/components/PremiumCard";

// Required VIP level for each toggle/privilege — numbers mirror the
// SVIP1..SVIP9 badges from the reference design, mapped onto our own
// 1–200 VIP ladder (lib/vip.js) so no separate tier system is needed.
const TOGGLES = [
 {
 key: "hideVisitorRecords",
 icon: "🕵️",
 level: 2,
 title: "Hide visitor records",
 desc: "When you turn on the switch, no visiting records will be left when you visit other people's profiles.",
 },
 {
 key: "avoidDisturbing",
 icon: "🚫",
 level: 4,
 title: "Avoid Disturbing",
 desc: "After turning it on, only users I follow can chat with me privately.",
 },
 {
 key: "hideOnlineStatus",
 icon: "👻",
 level: 4,
 title: "Hide Online Status",
 desc: "When you enter a room, others will not be able to see you.",
 },
];

const HONORARY = [
 { icon: "👁️", level: 1, title: "View visitor records", href: "/profile/visitors" },
 { icon: "🖼️", level: 1, title: "Profile background", href: "/profile" },
 { icon: "🎨", level: 3, title: "Customized theme", href: "/profile" },
 { icon: "🆔", level: 5, title: "Special ID", href: null },
 { icon: "🎞️", level: 6, title: "Dynamic Avatar (GIF)", href: null },
];

const OTHER = [
 { icon: "🔓", level: 7, title: "Unban account", href: "/help" },
 { icon: "🛡️", level: 9, title: "Ban account", href: "/help" },
];

function Badge({ level }) {
 return (
 <span className="shrink-0 rounded-md bg-gradient-to-r from-[#5c3d0b] to-[#a5661f] px-2 py-1 text-[10px] font-black text-[#ffd27a]">
 SVIP{level}
 </span>
 );
}

function Toggle({ on, disabled, onChange }) {
 return (
 <button
 role="switch"
 aria-checked={on}
 disabled={disabled}
 onClick={() => onChange(!on)}
 className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
 on ? "bg-emerald-500" : "bg-panel2 ring-1 ring-white/10"
 }`}
 >
 <span
 className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
 on ? "translate-x-5" : "translate-x-0.5"
 }`}
 />
 </button>
 );
}

export default function SvipSettingsPage() {
 const { user, profile, loading } = useAuth();
 const router = useRouter();
 const [busyKey, setBusyKey] = useState(null);

 useEffect(() => {
 if (!loading && !user) router.replace("/login");
 }, [loading, user, router]);

 if (loading || !user) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-void">
 <p className="text-mist text-sm">Loading…</p>
 </main>
 );
 }

 const vipTier = vipLevelForSpend(profile?.totalRechargedRs);
 const myLevel = vipTier.level;

 async function handleToggle(key, value) {
 setBusyKey(key);
 try {
 await updateDoc(doc(db, "users", user.uid), { [key]: value });
 } catch (err) {
 console.error("SVIP setting update failed:", err);
 } finally {
 setBusyKey(null);
 }
 }

 return (
 <main className="min-h-screen bg-void pb-16">
 <header className="flex items-center gap-3 px-5 pt-6">
 <Link href="/profile" className="text-lg text-ink/80">←</Link>
 <h1 className="font-display text-lg font-extrabold text-ink">SVIP Settings</h1>
 </header>
 <p className="mx-5 mt-1 text-[11px] text-mist">
 Aap abhi VIP {myLevel} par hain ({vipTier.name}) — jitna zyada recharge, utni zyada privileges unlock.
 </p>

 <p className="mx-5 mt-6 text-xs font-semibold uppercase tracking-wide text-mist">SVIP Settings</p>
 <div className="mx-5 mt-3 space-y-3">
 {TOGGLES.map((t) => {
 const unlocked = myLevel >= t.level;
 const on = unlocked && !!profile?.[t.key];
 return (
 <PremiumCard key={t.key} className="p-4">
 <div className="flex items-start gap-3">
 <span className="text-xl">{t.icon}</span>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <Badge level={t.level} />
 <p className="text-sm font-bold text-ink">{t.title}</p>
 </div>
 <p className="mt-1 text-[11px] text-mist">{t.desc}</p>
 {!unlocked && (
 <p className="mt-1 text-[10px] text-gold">
 Unlock hone ke liye VIP {t.level} chahiye.
 </p>
 )}
 </div>
 <Toggle
 on={on}
 disabled={!unlocked || busyKey === t.key}
 onChange={(v) => handleToggle(t.key, v)}
 />
 </div>
 </PremiumCard>
 );
 })}
 </div>

 <p className="mx-5 mt-7 text-xs font-semibold uppercase tracking-wide text-mist">Honorary privileges</p>
 <PremiumCard className="mx-5 mt-3 overflow-hidden !rounded-2xl p-0">
 {HONORARY.map((item, i) => {
 const unlocked = myLevel >= item.level;
 const target = unlocked && item.href ? item.href : "/vip";
 return (
 <Link
 key={item.title}
 href={target}
 className={`flex items-center gap-3 px-4 py-4 ${
 i < HONORARY.length - 1 ? "border-b border-white/5" : ""
 }`}
 >
 <span className="text-lg">{item.icon}</span>
 <Badge level={item.level} />
 <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.title}</span>
 {!unlocked && <span className="text-[10px] text-gold">🔒 Locked</span>}
 <span className="text-mist">›</span>
 </Link>
 );
 })}
 </PremiumCard>

 <p className="mx-5 mt-7 text-xs font-semibold uppercase tracking-wide text-mist">Other privilege</p>
 <PremiumCard className="mx-5 mt-3 overflow-hidden !rounded-2xl p-0">
 {OTHER.map((item, i) => {
 const unlocked = myLevel >= item.level;
 return (
 <Link
 key={item.title}
 href={item.href || "/vip"}
 className={`flex items-center gap-3 px-4 py-4 ${
 i < OTHER.length - 1 ? "border-b border-white/5" : ""
 }`}
 >
 <span className="text-lg">{item.icon}</span>
 <Badge level={item.level} />
 <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.title}</span>
 <span className="text-[10px] text-mist">
 {unlocked ? "Contact support" : "🔒 Locked"}
 </span>
 <span className="text-mist">›</span>
 </Link>
 );
 })}
 </PremiumCard>
 <p className="mx-5 mt-3 text-[10px] text-mist">
 Unban/Ban jaisi account-level actions hamesha support team hi verify karke karti hai — yeh yahan sirf aapki eligibility dikhata hai.
 </p>
 </main>
 );
}
