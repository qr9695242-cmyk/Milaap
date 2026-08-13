"use client";
import Link from "next/link";
import { GAME_CATALOG } from "@/lib/premiumCatalog";
import BottomNav from "@/components/BottomNav";

export default function GamesPage(){
  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="px-5 pt-7">
        <Link href="/profile" className="text-ink/70">‹</Link>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black text-ink">Premium Games</h1>
            <p className="mt-1 text-xs text-mist">14 playable games • skill, board, puzzle and arcade mechanics</p>
          </div>
          <span className="premium-chip">14 GAMES</span>
        </div>
      </header>

      <div className="mx-5 mt-4 rounded-2xl bg-amber-400/10 px-4 py-3 text-center ring-1 ring-amber-300/20">
        <p className="text-[11px] font-black text-amber-200">VIRTUAL COINS ONLY — NO REAL-MONEY WITHDRAWAL</p>
        <p className="mt-1 text-[10px] leading-4 text-mist">Coins may be used as game entry/stake and virtual rewards. No real-money betting, cash withdrawal, or cash-out is available.</p>
      </div>

      <section className="mx-5 mt-5 grid grid-cols-2 gap-3">
        {GAME_CATALOG.map((g, i) => (
          <Link key={g.id} href={g.href}
            className="group relative overflow-hidden rounded-3xl bg-panel ring-1 ring-white/10 shadow-[0_14px_36px_rgba(0,0,0,.28)] active:scale-[.98]">
            <div className="relative h-32 overflow-hidden bg-panel2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/game-art/${g.id}.jpg`}
                alt={`${g.title} game`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading={i < 4 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
              <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-black text-white/90 backdrop-blur">#{String(i+1).padStart(2,"0")}</span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-sm font-bold text-ink">{g.title}</p>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/30 text-gold ring-1 ring-gold/40">›</span>
              </div>
              <p className="mt-1 min-h-7 text-[10px] leading-4 text-mist">{g.desc}</p>
              <span className="mt-2 inline-flex rounded-full bg-glow-gradient px-2.5 py-1 text-[9px] font-black text-ink">PLAY NOW</span>
            </div>
          </Link>
        ))}
      </section>
      <BottomNav/>
    </main>
  );
}
