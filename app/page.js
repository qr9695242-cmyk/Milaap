"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import BottomNav from "@/components/BottomNav";
import SearchLink from "@/components/SearchLink";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

// Placeholder rooms — Phase 2 me ye Firestore/Agora se live data se replace hoga
const DEMO_ROOMS = [
  { id: "r1", title: "Late Night Chill", host: "Ayesha", viewers: 812, tag: "Live", level: 34 },
  { id: "r2", title: "Sindhi Room", host: "Adil Sultan", viewers: 1240, tag: "SVIP", level: 53 },
  { id: "r3", title: "Music Lounge", host: "DJ Noor", viewers: 356, tag: "Audio", level: 21 },
  { id: "r4", title: "Game Night", host: "Team Falcon", viewers: 209, tag: "Live", level: 12 },
];

const BANNERS = [
  { id: "b1", title: "PK Battle Arena", subtitle: "Team up & win the daily jackpot", cta: "Go" },
  { id: "b2", title: "Level Up Racing", subtitle: "Send gifts to climb the rocket ranks", cta: "Go" },
  { id: "b3", title: "Weekend Lucky Bag", subtitle: "Open a bag, win coins instantly", cta: "Go" },
];

const QUICK_LINKS = [
  { href: "/leaderboard", label: "Ranking", emoji: "🏆", grad: "from-emerald-400/90 to-teal-500/90" },
  { href: "/family", label: "Family", emoji: "🏠", grad: "from-amber-400/90 to-orange-500/90" },
  { href: "/profile/friends", label: "CP / Friend", emoji: "💞", grad: "from-pink-400/90 to-fuchsia-500/90" },
];

const CATEGORIES = ["Popular", "Live", "Audio Room"];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [bannerIdx, setBannerIdx] = useState(0);
  const [category, setCategory] = useState("Popular");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const banner = BANNERS[bannerIdx];
  const rooms =
    category === "Popular"
      ? DEMO_ROOMS
      : DEMO_ROOMS.filter((r) => r.tag.toLowerCase() === category.split(" ")[0].toLowerCase());

  return (
    <main className="min-h-screen bg-void pb-28">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs text-mist">Welcome back</p>
          <h1 className="font-display text-xl font-extrabold text-ink">
            {profile?.displayName || "Guest"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 rounded-full bg-panel px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1 text-gold">
              ◆ {profile?.diamonds ?? 0}
            </span>
            <span className="flex items-center gap-1 text-diamond">
              ● {profile?.coins ?? 0}
            </span>
          </div>
          <SearchLink />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      {/* Banner carousel */}
      <section className="mx-5 mt-6">
        <div className="relative overflow-hidden rounded-2xl bg-glow-gradient p-5 shadow-glow">
          <p className="font-display text-lg font-extrabold text-ink">{banner.title}</p>
          <p className="mt-1 text-sm text-ink/80">{banner.subtitle}</p>
          <Link
            href="/rooms"
            className="mt-4 inline-block rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-void"
          >
            {banner.cta}
          </Link>
          {/* dots */}
          <div className="mt-4 flex gap-1.5">
            {BANNERS.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setBannerIdx(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === bannerIdx ? "w-5 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Quick access: Ranking / Family / CP-Friend */}
      <section className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br ${q.grad} px-2 py-4 shadow-sm active:opacity-80`}
          >
            <span className="text-2xl leading-none">{q.emoji}</span>
            <span className="text-xs font-bold text-white">{q.label}</span>
          </Link>
        ))}
      </section>

      {/* Category tabs */}
      <section className="mt-8 px-5">
        <div className="flex items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                category === c
                  ? "bg-glow-gradient text-ink shadow-glow"
                  : "bg-panel text-mist"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Room grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href="/rooms"
              className="group overflow-hidden rounded-xl bg-panel shadow-sm ring-1 ring-white/5 active:opacity-90"
            >
              {/* thumbnail placeholder — swap for room.coverUrl once live */}
              <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-neon-violet/30 to-neon-pink/30">
                <span className="text-3xl">🎥</span>
                <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-gold">
                  Lv.{room.level}
                </span>
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    room.tag === "SVIP"
                      ? "bg-gold/90 text-void"
                      : "bg-neon-pink/80 text-white"
                  }`}
                >
                  {room.tag}
                </span>
              </div>
              <div className="p-3">
                <p className="truncate font-display text-sm font-bold text-ink">
                  {room.title}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="truncate text-xs text-mist">{room.host}</p>
                  <span className="text-[10px] text-mist">{room.viewers} 👁</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
