"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenActiveEventBanners, claimEventBanner } from "@/lib/eventBanners";

// Small rotating promo strip above the video stage — mirrors the
// "Get a rare medal!" / "Friend match" banners seen on other live apps.
// These built-in slides just deep-link into features that already exist
// (Rewards, Friends) — no gambling/lucky-draw mechanic here.
const DEFAULT_SLIDES = [
 {
 id: "medal",
 icon: "🏅",
 text: "Get a rare medal!",
 href: "/rewards",
 },
 {
 id: "friend",
 icon: "💞",
 text: "Send a gift, become Friends",
 href: "/profile/friends",
 },
];

export default function EventBanner() {
 const router = useRouter();
 const { user } = useAuth();
 const [index, setIndex] = useState(0);
 const [customSlides, setCustomSlides] = useState([]);
 const [claiming, setClaiming] = useState(false);
 const [toast, setToast] = useState("");

 // Admin-created occasion banners (Eid, events, etc. — see /admin →
 // "Occasion Banners") show first, then the built-in ones rotate after.
 useEffect(() => {
 const unsub = listenActiveEventBanners(
 (banners) =>
 setCustomSlides(
 banners.map((b) => ({
 id: b.id,
 icon: b.giftIcon || "🎉",
 text: b.title,
 href: b.href,
 imageUrl: b.imageUrl,
 coins: b.coins,
 custom: true,
 }))
 ),
 () => {} // if this fails (e.g. offline), just show the built-in slides
 );
 return unsub;
 }, []);

 const slides = customSlides.length > 0 ? [...customSlides, ...DEFAULT_SLIDES] : DEFAULT_SLIDES;

 useEffect(() => {
 setIndex(0);
 }, [slides.length]);

 useEffect(() => {
 const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4000);
 return () => clearInterval(t);
 }, [slides.length]);

 useEffect(() => {
 if (!toast) return;
 const t = setTimeout(() => setToast(""), 2500);
 return () => clearTimeout(t);
 }, [toast]);

 const slide = slides[index % slides.length];

 async function handleTap() {
 if (slide.custom && slide.coins > 0) {
 if (!user) {
 router.push("/login");
 return;
 }
 setClaiming(true);
 try {
 const { coinsGained, alreadyClaimed } = await claimEventBanner(user.uid, slide.id);
 setToast(
 alreadyClaimed
 ? "Ye reward pehle hi claim ho chuka hai."
 : `+${coinsGained} coins mil gaye! 🎉`
 );
 } catch (err) {
 setToast(err.message || "Claim nahi ho saka.");
 } finally {
 setClaiming(false);
 }
 return;
 }
 if (slide.href) router.push(slide.href);
 }

 return (
 <div className="mx-4 mt-2">
 <button
 onClick={handleTap}
 disabled={claiming}
 className="flex w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-neon-violet/25 to-transparent px-3 py-2 ring-1 ring-white/10 disabled:opacity-70"
 >
 <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-ink">
 {slide.imageUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={slide.imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
 ) : (
 <span className="text-base">{slide.icon}</span>
 )}
 <span className="truncate">
 {slide.text}
 {slide.custom && slide.coins > 0 ? ` · ● ${slide.coins.toLocaleString()}` : ""}
 </span>
 </span>
 <span className="shrink-0 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-void">
 {slide.custom && slide.coins > 0 ? (claiming ? "…" : "Claim") : "Go"}
 </span>
 </button>
 {toast && <p className="mt-1 px-1 text-[11px] text-mist">{toast}</p>}
 </div>
 );
}
