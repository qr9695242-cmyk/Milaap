"use client";

import { useRouter } from "next/navigation";
import { Dices, Swords, CircleDot, Target } from "lucide-react";
import { GAME_CATALOG } from "@/lib/premiumCatalog";

export default function GameQuickPicks({ compact = false, inline = false }) {
 const router = useRouter();
 const picks = [
 { game: GAME_CATALOG.find(g => g.id === "ludo"), Icon: Dices },
 { game: GAME_CATALOG.find(g => g.id === "chess"), Icon: Swords },
 { game: GAME_CATALOG.find(g => g.id === "carrom"), Icon: CircleDot },
 { game: GAME_CATALOG.find(g => g.id === "archery"), Icon: Target },
 ].filter(x => x.game);

 if (inline) {
 return (
 <div className="flex items-center gap-1">
 {picks.map(({ game, Icon }) => (
 <button key={game.id} onClick={() => router.push(game.href)} aria-label={game.title}
 className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gold ring-1 ring-white/10 active:scale-95">
 <Icon size={18} strokeWidth={2.2} />
 </button>
 ))}
 </div>
 );
 }

 return (
 <div className={`mx-4 ${compact ? "mt-1" : "mt-3"}`}>
 <div className="grid grid-cols-4 gap-2">
 {picks.map(({ game, Icon }) => (
 <button key={game.id} onClick={() => router.push(game.href)} aria-label={game.title}
 className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl bg-black/35 px-1 py-2.5 ring-1 ring-white/10 active:scale-95">
 <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-gold"><Icon size={20} strokeWidth={2.2} /></span>
 <span className="w-full truncate text-center text-[9px] font-bold text-ink">{game.title}</span>
 </button>
 ))}
 </div>
 </div>
 );
}
