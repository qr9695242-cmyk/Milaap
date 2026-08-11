"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import BottomNav from "@/components/BottomNav";
import SearchLink from "@/components/SearchLink";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { GAME_CATALOG } from "@/lib/premiumCatalog";
import PremiumCard from "@/components/PremiumCard";
import { listenActiveRooms } from "@/lib/rooms";
import DailyRewardModal from "@/components/DailyRewardModal";

const GAMES = GAME_CATALOG;

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

const CATEGORIES = ["Popular", "Audio Room", "Games"];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [bannerIdx, setBannerIdx] = useState(0);
  const [category, setCategory] = useState("Popular");
  const [liveRooms, setLiveRooms] = useState([]);
  const [roomsError, setRoomsError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenActiveRooms(setLiveRooms, (err) =>
      setRoomsError(err?.message || "Rooms load nahi ho sakay.")
    );
    return () => unsub();
  }, []);

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
      ? liveRooms
      : category === "Audio Room"
      ? liveRooms.filter((r) => r.type === "audio")
      : [];
  const totalViewers = liveRooms.reduce((n, r) => n + (r.viewerCount || 0), 0);

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
          <div className="premium-chip flex items-center gap-3">
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

      <section className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <Link href="/rooms">
          <PremiumCard className="p-3 active:scale-[.98] transition-transform">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink">🔴 Live now</span><span className="text-[10px] text-emerald-300">Online</span></div>
            <p className="mt-2 text-lg font-extrabold text-ink">{totalViewers.toLocaleString()}+</p>
            <p className="text-[10px] text-mist">people watching rooms</p>
          </PremiumCard>
        </Link>
        <Link href="/messages">
          <PremiumCard className="p-3 active:scale-[.98] transition-transform">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink">💬 Messages</span><span className="rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold text-gold">LIVE</span></div>
            <p className="mt-2 text-sm font-bold text-ink">Chat with friends</p>
            <p className="text-[10px] text-mist">Text + voice notes</p>
          </PremiumCard>
        </Link>
      </section>

      {/* Banner carousel */}
      <section className="mx-5 mt-6">
        <div className="relative overflow-hidden rounded-2xl bg-glow-gradient p-5 shadow-glow">
          <p className="font-display text-lg font-extrabold text-ink">{banner.title}</p>
          <p className="mt-1 text-sm text-ink/80">{banner.subtitle}</p>
          <Link
            href="/rooms"
            className="premium-btn mt-4 inline-block !rounded-full"
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

        {roomsError && (
          <p className="mt-4 rounded-xl bg-panel p-3 text-xs text-gold ring-1 ring-gold/20">
            Rooms load nahi ho sakay: {roomsError}
          </p>
        )}

        {/* Room grid, or Games grid when the Games tab is active */}
        {category === "Games" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {GAMES.map((game) => (
              <Link key={game.id} href={game.href} className="group active:opacity-90">
                <PremiumCard className="overflow-hidden">
                  <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-neon-violet/30 to-neon-pink/30">
                    <span className="text-3xl">{game.emoji}</span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-display text-sm font-bold text-ink">{game.title}</p>
                    <p className="mt-1 truncate text-xs text-mist">{game.desc}</p>
                  </div>
                </PremiumCard>
              </Link>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <p className="mt-6 text-center text-xs text-mist">
            Koi room abhi live nahi hai — sabse pehle ek shuru karein.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {rooms.map((room) => (
              <Link key={room.id} href={`/audio-room/${room.id}`} className="group active:opacity-90">
                <PremiumCard className="overflow-hidden">
                  <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-neon-violet/30 to-neon-pink/30">
                    <span className="text-3xl">🎙️</span>
                    <span className="absolute right-2 top-2 rounded-full bg-neon-pink/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {room.type === "audio" ? "Audio" : "Live"}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-display text-sm font-bold text-ink">
                      {room.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="truncate text-xs text-mist">{room.hostName}</p>
                      <span className="text-[10px] text-mist">{room.viewerCount || 0} 👁</span>
                    </div>
                  </div>
                </PremiumCard>
              </Link>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
      <DailyRewardModal />
    </main>
  );
}
