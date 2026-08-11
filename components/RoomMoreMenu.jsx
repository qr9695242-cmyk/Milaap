"use client";

import { useState } from "react";
import Link from "next/link";

const MORE_LINKS = [
  { href: "/ludo", icon: "🎲", label: "Ludo" },
  { href: "/rewards", icon: "🎁", label: "Rewards" },
  { href: "/leaderboard", icon: "🏆", label: "Leaderboard" },
  { href: "/family", icon: "👪", label: "Family" },
  { href: "/agency", icon: "🏢", label: "Agency" },
  { href: "/vip", icon: "👑", label: "VIP" },
];

export default function RoomMoreMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="More"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-panel text-sm ring-1 ring-white/10"
      >
        ⊞
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-panel p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-sm font-bold text-ink">More</h2>
            <div className="mt-4 grid grid-cols-5 gap-3">
              {MORE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-panel2 text-xl ring-1 ring-white/10">
                    {l.icon}
                  </span>
                  <span className="text-center text-[9px] text-mist">{l.label}</span>
                </Link>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 text-center text-xs text-mist">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
