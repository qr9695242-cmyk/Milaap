"use client";

import { useState } from "react";
import { VOICE_CHANGER_PRESETS } from "@/lib/voiceChanger";
import { VOICE_UNLOCKS, purchaseVoicePreset } from "@/lib/voiceChangerAccess";

export default function VoiceChangerPicker({ current, onSelect, uid, unlocked = ["original"] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [localUnlocked, setLocalUnlocked] = useState(unlocked);
  const activePreset = VOICE_CHANGER_PRESETS.find((p) => p.id === current) || VOICE_CHANGER_PRESETS[0];

  async function choose(p) {
    const item = VOICE_UNLOCKS[p.id] || { price: 0 };
    const isUnlocked = item.price === 0 || localUnlocked.includes(p.id);
    if (isUnlocked) {
      onSelect(p.id);
      setOpen(false);
      return;
    }
    if (!uid || busy) return;
    const ok = window.confirm(`${p.label} unlock karne ke liye ${item.price.toLocaleString()} coins lagenge. Purchase karein?`);
    if (!ok) return;
    try {
      setBusy(true);
      setMessage("");
      await purchaseVoicePreset(uid, p.id);
      setLocalUnlocked((prev) => [...new Set([...prev, p.id])]);
      onSelect(p.id);
      setOpen(false);
    } catch (e) {
      setMessage(e?.message || "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-full bg-panel px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10">
        <span>{activePreset.emoji}</span><span>Voice</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-panel p-5 pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-sm font-bold text-ink">Voice Changer</h2>
            <p className="mt-1 text-[11px] text-mist">Locked effects start at 400,000 coins.</p>
            {message && <p className="mt-2 rounded-lg bg-neon-pink/10 p-2 text-xs text-neon-pink">{message}</p>}
            <div className="mt-4 grid grid-cols-5 gap-3">
              {VOICE_CHANGER_PRESETS.map((p) => {
                const item = VOICE_UNLOCKS[p.id] || { price: 0 };
                const isUnlocked = item.price === 0 || localUnlocked.includes(p.id);
                return (
                  <button key={p.id} disabled={busy} onClick={() => choose(p)} className="flex flex-col items-center gap-1 disabled:opacity-50">
                    <span className={`relative flex h-12 w-12 items-center justify-center rounded-xl text-xl ring-1 ${p.id === current ? "bg-gold/20 ring-gold/50" : "bg-panel2 ring-white/10"}`}>
                      {p.emoji}
                      {!isUnlocked && <span className="absolute -right-1 -top-1 text-sm">🔒</span>}
                    </span>
                    <span className="text-center text-[9px] text-mist">{p.label}</span>
                    {!isUnlocked && <span className="text-[8px] text-gold">{item.price.toLocaleString()}</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 text-center text-xs text-mist">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
