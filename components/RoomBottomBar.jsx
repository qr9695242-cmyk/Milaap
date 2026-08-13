"use client";

import { useState } from "react";
import Link from "next/link";
import RoomMoreMenu from "@/components/RoomMoreMenu";
import GameQuickPicks from "@/components/GameQuickPicks";

export default function RoomBottomBar({ speakerOn, onToggleSpeaker, onSend, onOpenGifts, unread = 0 }) {
  const [text, setText] = useState("");
  function handleSubmit(e) { e.preventDefault(); if (!text.trim()) return; onSend?.(text); setText(""); }
  return (
    <div className="sticky bottom-0 z-50 border-t border-white/10 bg-black/75 px-2 pb-safe pt-2 backdrop-blur-xl">
      <div className="mx-auto max-w-md">
        <div className="mb-1 grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-1.5">
          <button type="button" onClick={onToggleSpeaker} aria-label={speakerOn ? "Mute room sound" : "Unmute room sound"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base">{speakerOn ? "🔊" : "🔈"}</button>
          <form onSubmit={handleSubmit} className="min-w-0"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Say hi…" maxLength={300}
            className="w-full rounded-full bg-white/10 px-3 py-2 text-xs text-ink outline-none ring-1 ring-white/10" /></form>
          <Link href="/messages" aria-label="Messages" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm">✉</Link>
          <GameQuickPicks inline />
          <button type="button" onClick={onOpenGifts} aria-label="Send a gift"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold/50 to-neon-pink/40 text-xl ring-1 ring-gold/50">🎁</button>
          <RoomMoreMenu unread={unread} />
        </div>
      </div>
    </div>
  );
}
