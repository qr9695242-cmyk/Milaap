"use client";

import { useState } from "react";
import { GAME_STAKES } from "@/lib/gameEconomy";
import { Coins } from "lucide-react";

export default function GameWalletControls({ profile, stake, setStake, busy = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-mist">Milaap Coins</p>
          <p className="flex items-center gap-1 font-display text-lg font-black text-yellow-200"><Coins className="h-4 w-4" /> {(profile?.coins || 0).toLocaleString()}</p>
        </div>
        <button type="button" disabled={busy} onClick={() => setOpen(v => !v)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
          Entry: {stake ? `${stake.toLocaleString()} coins` : "Free"}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {GAME_STAKES.map(v => (
            <button key={v} type="button" disabled={busy || (v > 0 && (profile?.coins || 0) < v)} onClick={() => { setStake(v); setOpen(false); }} className={`rounded-lg px-2 py-2 text-[10px] font-black ${stake === v ? "bg-yellow-300 text-black" : "bg-white/10"}`}>
              {v === 0 ? "FREE" : v.toLocaleString()}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[9px] text-mist/70">Virtual Milaap coins only. Entry is reserved atomically and a skill-based reward is credited once per round.</p>
    </div>
  );
}
