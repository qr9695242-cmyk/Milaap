"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";
import { GIFT_LEVELS, giftLevelForCoins, nextGiftLevel, formatCompactCoins, giftBands } from "@/lib/giftLevel";

export default function Level(){
 const {profile}=useAuth();
 const gifted=Number(profile?.totalCoinsGifted||0);
 const current=giftLevelForCoins(gifted);
 const next=nextGiftLevel(gifted);
 const [selected,setSelected]=useState(current.level);
 const tier=GIFT_LEVELS[selected] || current;
 return <main className="min-h-screen bg-void pb-28 text-ink">
  <header className="px-5 pt-7"><Link href="/profile" className="text-ink/70">‹</Link><h1 className="mt-2 font-display text-2xl font-black">🎁 Gift Level</h1><p className="mt-1 text-xs text-mist">Lifetime gift coins sent • 200 levels</p></header>
  <section className="mx-5 mt-5 rounded-2xl bg-glow-gradient p-5">
   <p className="text-xs text-ink/80">Current Level</p><p className="mt-1 text-4xl font-black text-ink">Lv.{current.level}</p>
   <p className="mt-2 text-xs text-ink/80">Total gifted: {gifted.toLocaleString()} Coins</p>
   {next && <p className="mt-2 text-[11px] text-ink/80">Next: Lv.{next.level} at {formatCompactCoins(next.minCoins)} Coins • {formatCompactCoins(Math.max(0,next.minCoins-gifted))} remaining</p>}
  </section>
  <section className="mx-5 mt-4 rounded-2xl bg-panel p-4 ring-1 ring-white/10">
   <p className="text-xs uppercase tracking-wide text-mist">Selected level</p><p className="mt-1 text-lg font-black" style={{color:tier.color}}>{tier.name}</p><p className="mt-1 text-xs text-mist">Total gift coins required: {tier.minCoins.toLocaleString()}</p>
  </section>
  <section className="mx-5 mt-6 space-y-5">
   {giftBands().map(b=> <div key={b.name}><div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{backgroundColor:b.color}}/><span className="text-xs font-bold" style={{color:b.color}}>{b.name}</span><span className="text-[10px] text-mist">Lv.{b.from}–{b.to}</span></div><div className="grid grid-cols-8 gap-2">{GIFT_LEVELS.filter(t=>t.level>=b.from&&t.level<=b.to).map(t=><button key={t.level} onClick={()=>setSelected(t.level)} className={`aspect-square rounded-lg text-[10px] font-bold ring-1 ${t.level===current.level?"ring-2":"ring-white/5"} ${t.level>current.level?"opacity-35":""}`} style={{backgroundColor:`${t.color}22`,color:t.color}}>{t.level}</button>)}</div></div>)}
  </section>
  <BottomNav/>
 </main>
}
