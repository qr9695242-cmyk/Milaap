"use client";

import { useState, useEffect } from "react";
import { GIFT_CATALOG, sendGift } from "@/lib/gifts";

/**
 * Two modes:
 *  - Fixed target (live-room): pass toUid + toName, picker is skipped.
 *  - Multi target (audio-room, seat-based): pass `targets` (array of
 *    {uid, name}, i.e. everyone else currently seated) and a chip picker
 *    renders above the gifts so any seated user can be gifted, not just
 *    a hardcoded host.
 */
export default function GiftBar({ roomId, fromUid, fromName, toUid, toName, targets, myCoins, onClose }) {
  const [sending, setSending] = useState(null);
  const [error, setError] = useState("");
  const [selectedUid, setSelectedUid] = useState(toUid || targets?.[0]?.uid || "");

  useEffect(() => {
    // agar list badal jaye (koi seat chhod de) aur selected target ab
    // available na ho, to pehle wale valid target par wapas gir jao
    if (targets && !targets.some((t) => t.uid === selectedUid)) {
      setSelectedUid(targets[0]?.uid || "");
    }
  }, [targets, selectedUid]);

  const activeTarget = targets
    ? targets.find((t) => t.uid === selectedUid)
    : { uid: toUid, name: toName };

  async function handleSend(gift) {
    setError("");
    if (!activeTarget?.uid) {
      setError("Pehle kisi ko gift karne ke liye select karein.");
      return;
    }
    if (myCoins < gift.cost) {
      setError("Not enough coins — recharge from Wallet.");
      return;
    }
    setSending(gift.id);
    try {
      await sendGift(roomId, {
        fromUid,
        fromName,
        toUid: activeTarget.uid,
        toName: activeTarget.name,
        gift,
      });
    } catch (err) {
      setError(err.message || "Could not send gift.");
    } finally {
      setSending(null);
    }
  }

  if (targets && targets.length === 0) {
    return (
      <div className="border-t border-white/5 px-3 py-2">
        {onClose && (
          <div className="mb-1 flex justify-end">
            <button onClick={onClose} className="text-xs text-mist">✕ Close</button>
          </div>
        )}
        <p className="text-[11px] text-mist">
          Gift bhejne ke liye room mein koi aur seated ho tabhi option aayega.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-white/5 px-3 py-2">
      {onClose && (
        <div className="mb-1 flex justify-end">
          <button onClick={onClose} className="text-xs text-mist">✕ Close</button>
        </div>
      )}
      {targets && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {targets.map((t) => (
            <button
              key={t.uid}
              onClick={() => setSelectedUid(t.uid)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                selectedUid === t.uid
                  ? "bg-glow-gradient text-ink ring-transparent"
                  : "bg-panel text-mist ring-white/10"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mb-1 text-[11px] text-neon-pink">{error}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {GIFT_CATALOG.map((gift) => (
          <button
            key={gift.id}
            onClick={() => handleSend(gift)}
            disabled={sending === gift.id}
            className="flex min-w-[64px] flex-col items-center rounded-xl bg-panel px-2 py-2 ring-1 ring-white/5 disabled:opacity-50"
          >
            <span className="text-xl">{gift.icon}</span>
            <span className="mt-1 text-[10px] text-ink">{gift.name}</span>
            <span className="text-[10px] text-gold">● {gift.cost}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
