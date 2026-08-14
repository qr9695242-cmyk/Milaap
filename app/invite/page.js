"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";
import { ensureReferralCode, getReferralConfig } from "@/lib/referral";

export default function Invite() {
 const { user, profile } = useAuth();
 const [code, setCode] = useState(profile?.referralCode || "");
 const [origin, setOrigin] = useState("");
 const [config, setConfig] = useState(null); // { enabled, coinsPerReferral, expiresAt }
 const [copiedCode, setCopiedCode] = useState(false);
 const [copiedLink, setCopiedLink] = useState(false);
 const [error, setError] = useState("");

 useEffect(() => {
 if (typeof window !== "undefined") setOrigin(window.location.origin);
 }, []);

 useEffect(() => {
 getReferralConfig().then(setConfig).catch(() => setConfig(null));
 }, []);

 useEffect(() => {
 if (profile?.referralCode) {
 setCode(profile.referralCode);
 return;
 }
 if (!user) return;
 ensureReferralCode(user.uid)
 .then(setCode)
 .catch((err) => setError(err.message || "Code nahi ban saka."));
 }, [user, profile?.referralCode]);

 const link = code && origin ? `${origin}/signup?ref=${code}` : "";

 async function copyCode() {
 if (!code) return;
 try {
 await navigator.clipboard.writeText(code);
 setCopiedCode(true);
 setTimeout(() => setCopiedCode(false), 1500);
 } catch {}
 }

 async function shareLink() {
 if (!link) return;
 const shareText = config?.enabled
 ? `Milaap join karo mere invite se aur dono ko bonus coins milenge! ${link}`
 : `Milaap join karo mere invite se! ${link}`;
 if (navigator.share) {
 try {
 await navigator.share({ title: "Milaap", text: shareText, url: link });
 return;
 } catch {
 // user cancelled the share sheet — fall through to copy
 }
 }
 try {
 await navigator.clipboard.writeText(link);
 setCopiedLink(true);
 setTimeout(() => setCopiedLink(false), 1500);
 } catch {}
 }

 const coinsLabel = (config?.coinsPerReferral ?? 20000).toLocaleString();
 const offerLive = !!config?.enabled && (!config?.expiresAt || config.expiresAt > new Date());
 const expiryLabel = config?.expiresAt
 ? config.expiresAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
 : "";

 return (
 <main className="min-h-screen bg-void pb-28">
 <header className="px-5 pt-7">
 <Link href="/profile" className="text-ink/70">‹</Link>
 <h1 className="mt-2 font-display text-2xl font-black text-ink">👥 Invite Friends</h1>
 </header>

 <section className="mx-5 mt-5 rounded-2xl bg-glow-gradient p-6 text-center">
 <p className="text-5xl">🎁</p>
 <p className="mt-3 font-display text-xl font-black text-ink">
 {offerLive ? `Earn ${coinsLabel} Coins` : "Earn Coins"}
 </p>
 <p className="mt-1 text-xs text-ink/80">
 {offerLive
 ? `Jab tumhara friend is link se sign up karega, tumhein ${coinsLabel} coins milenge.`
 : "Share your invite code with friends."}
 </p>
 {offerLive && expiryLabel && (
 <p className="mt-1 text-[11px] text-ink/70">Limited-time offer — {expiryLabel} tak.</p>
 )}
 {!config?.enabled && config !== null && (
 <p className="mt-1 text-[11px] text-ink/70">Referral bonus abhi paused hai — jald wapas aayega.</p>
 )}

 <div className="mt-5 rounded-xl bg-white/30 p-3 font-black tracking-[.3em] text-ink">
 {code || "…"}
 </div>
 <button
 onClick={copyCode}
 disabled={!code}
 className="mt-4 w-full rounded-full bg-white py-3 text-sm font-bold text-void disabled:opacity-60"
 >
 {copiedCode ? "Copied!" : "Copy Code"}
 </button>

 <button
 onClick={shareLink}
 disabled={!link}
 className="mt-3 w-full rounded-full bg-void/20 py-3 text-sm font-bold text-ink ring-1 ring-white/40 disabled:opacity-60"
 >
 {copiedLink ? "Link Copied!" : "Share Invite Link"}
 </button>

 {link && (
 <p className="mt-3 break-all text-[11px] text-ink/70">{link}</p>
 )}
 {error && <p className="mt-3 text-[11px] text-red-100">{error}</p>}
 </section>

 <BottomNav />
 </main>
 );
}
