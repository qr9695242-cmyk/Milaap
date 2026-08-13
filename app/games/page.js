"use client";
import Link from "next/link";
import { GAME_CATALOG } from "@/lib/premiumCatalog";
import BottomNav from "@/components/BottomNav";
import * as Icons from "lucide-react";

export default function GamesPage(){
  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="px-5 pt-7">
        <Link href="/profile" className="text-ink/70">‹</Link>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black text-ink">Premium Games</h1>
            <p className="mt-1 text-xs text-mist">14 game rooms • real game-specific boards and controls</p>
          </div>
          <span className="premium-chip">14 GAMES</span>
        </div>
      </header>
      <section className="mx-5 mt-5 grid grid-cols-2 gap-3">
        {GAME_CATALOG.map((g, i)=>{
          const Icon = Icons[g.icon] || Icons.Gamepad2;
          return <Link key={g.id} href={g.href}
            className="group relative overflow-hidden rounded-3xl bg-panel ring-1 ring-white/10 shadow-[0_14px_36px_rgba(0,0,0,.28)] active:scale-[.98]">
            <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-neon-violet/30 via-panel2 to-neon-pink/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,195,77,.16),transparent_48%)]" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/10">
                <Icon size={34} strokeWidth={1.8} />
              </span>
              <span className="absolute right-2 top-2 rounded-full bg-black/35 px-2 py-1 text-[9px] font-black text-white/80 backdrop-blur">#{String(i+1).padStart(2,"0")}</span>
            </div>
            <div className="p-3">
              <p className="font-display text-sm font-bold text-ink">{g.title}</p>
              <p className="mt-1 min-h-7 text-[10px] leading-4 text-mist">{g.desc}</p>
              <span className="mt-2 inline-flex rounded-full bg-glow-gradient px-2.5 py-1 text-[9px] font-black text-ink">PLAY NOW</span>
            </div>
          </Link>;
        })}
      </section>
      <BottomNav/>
    </main>
  );
}
