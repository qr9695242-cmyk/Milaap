"use client";

import { useState } from "react";
import { VOICE_EFFECT_CATALOG, purchaseVoiceEffect, equipVoiceEffect } from "@/lib/voiceEffects";

/**
 * 🎙️ Voice pill + bottom-sheet list (Original / Deep / Chipmunk / Robot / Cave).
 * Locked effects show their coin price; tapping a locked one buys it first
 * (if the user has enough coins) then equips it. `onChange(effectId)` fires
 * after a successful equip so the parent can swap the live audio graph.
 */
export default function VoiceEffectPicker({ uid, coins, ownedEffects, equippedEffect, onChange, unsupported }) {
 const [open, setOpen] = useState(false);
 const [busyId, setBusyId] = useState(null);
 const [err, setErr] = useState("");

 const owned = ownedEffects || [];
 const current = equippedEffect || "original";
 const currentItem = VOICE_EFFECT_CATALOG.find((e) => e.id === current) || VOICE_EFFECT_CATALOG[0];

 async function pick(item) {
 setErr("");
 setBusyId(item.id);
 try {
 if (!item.free && !owned.includes(item.id)) {
 if ((coins ?? 0) < item.priceCoins) {
 setErr("Not enough coins for this voice effect.");
 return;
 }
 await purchaseVoiceEffect(uid, item.id);
 }
 await equipVoiceEffect(uid, item.id);
 onChange?.(item.id);
 setOpen(false);
 } catch (e) {
 setErr(e?.message || "Could not switch voice effect");
 } finally {
 setBusyId(null);
 }
 }

 return (
 <>
 <button
 onClick={() => setOpen(true)}
 className="rounded-full bg-panel px-4 py-2 text-xs font-semibold text-ink ring-1 ring-white/10"
 >
 {currentItem.emoji} Voice
 </button>

 {open && (
 <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
 <div className="w-full max-w-md rounded-t-2xl bg-panel p-5" onClick={(e) => e.stopPropagation()}>
 <h2 className="font-display text-sm font-bold text-ink">Voice Effects</h2>

 {unsupported && (
 <p className="mt-2 rounded-lg bg-void/50 p-2 text-[11px] text-neon-pink">
 Voice effects unavailable on this device — Original is the only option right now.
 </p>
 )}
 {err && <p className="mt-2 text-[11px] text-neon-pink">{err}</p>}

 <div className="mt-4 flex flex-col gap-2">
 {VOICE_EFFECT_CATALOG.map((item) => {
 const isOwned = item.free || owned.includes(item.id);
 const isCurrent = current === item.id;
 const disabled = unsupported && !item.free ? true : busyId === item.id;
 return (
 <button
 key={item.id}
 disabled={disabled}
 onClick={() => pick(item)}
 className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left ring-1 disabled:opacity-50 ${
 isCurrent ? "bg-neon-violet/15 ring-neon-violet" : "bg-void/40 ring-white/10"
 }`}
 >
 <span className="flex items-center gap-2 text-sm text-ink">
 <span>{item.emoji}</span>
 <span>{item.name}</span>
 </span>
 {isCurrent ? (
 <span className="text-xs font-semibold text-neon-violet">Active</span>
 ) : isOwned ? (
 <span className="text-xs text-mist">{busyId === item.id ? "…" : "Select"}</span>
 ) : (
 <span className="flex items-center gap-1 text-xs font-semibold text-gold">
 🔒 {item.priceCoins.toLocaleString()}
 </span>
 )}
 </button>
 );
 })}
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
