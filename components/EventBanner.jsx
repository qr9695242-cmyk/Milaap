"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Small rotating promo strip above the video stage — mirrors the
// "Get a rare medal!" / "Friend match" banners seen on other live apps.
// Both just deep-link into features that already exist (Rewards,
// Friends) — no new gambling/lucky-draw mechanic here.
const SLIDES = [
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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];

  return (
    <button
      onClick={() => router.push(slide.href)}
      className="mx-4 mt-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-neon-violet/25 to-transparent px-3 py-2 ring-1 ring-white/10"
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-ink">
        <span className="text-base">{slide.icon}</span>
        {slide.text}
      </span>
      <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-void">
        Go
      </span>
    </button>
  );
}
