"use client";

import { useEffect, useRef, useState } from "react";
import { listenGiftFeed } from "@/lib/gifts";

/**
 * Big center-screen gift animation — every gift sent in the room, not just
 * the ones you send. This is separate from GiftFeed (the small "X sent Y"
 * text log in the corner): GiftPopup is the splashy Bigo/TikTok-style
 * banner everyone in the room actually notices, with a live combo counter
 * ("x3", "x4"...) when the same sender fires off the same gift repeatedly
 * within a couple seconds, instead of stacking separate popups.
 *
 * Queued exactly like EntranceBanner so gifts from different people never
 * overlap, but a same-sender/same-gift repeat extends the current popup
 * in place rather than joining the queue.
 */
export default function GiftPopup({ roomId }) {
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out"
  const [combo, setCombo] = useState(1);

  const queueRef = useRef([]);
  const seenRef = useRef(new Set());
  const showingRef = useRef(false);
  const firstLoadRef = useRef(true);
  const holdTimerRef = useRef(null);
  const outTimerRef = useRef(null);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    const unsub = listenGiftFeed(roomId, (gifts) => {
      // Don't replay the room's whole gift history the moment we mount
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        gifts.forEach((g) => seenRef.current.add(g.id));
        return;
      }
      for (const g of gifts) {
        if (seenRef.current.has(g.id)) continue;
        seenRef.current.add(g.id);
        handleIncoming(g);
      }
    });
    return () => {
      unsub();
      clearTimeout(holdTimerRef.current);
      clearTimeout(outTimerRef.current);
      clearTimeout(clearTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function handleIncoming(gift) {
    // Same sender fired the same gift again while a popup for it is still
    // showing — bump the combo instead of queueing a second popup.
    if (showingRef.current) {
      const cur = queueRef.current._activeRef;
      if (cur && cur.fromUid === gift.fromUid && cur.giftId === gift.giftId) {
        bumpCombo();
        return;
      }
    }
    queueRef.current.push(gift);
    pump();
  }

  function bumpCombo() {
    setCombo((c) => c + 1);
    // Restart the hold/out timers so a fast combo keeps the popup alive
    clearTimeout(holdTimerRef.current);
    clearTimeout(outTimerRef.current);
    clearTimeout(clearTimerRef.current);
    setPhase("hold");
    outTimerRef.current = setTimeout(() => setPhase("out"), 2200);
    clearTimerRef.current = setTimeout(finishCurrent, 2700);
  }

  function pump() {
    if (showingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    showingRef.current = true;
    queueRef.current._activeRef = next;
    setCurrent(next);
    setCombo(1);
    setPhase("in");

    holdTimerRef.current = setTimeout(() => setPhase("hold"), 350);
    outTimerRef.current = setTimeout(() => setPhase("out"), 2500);
    clearTimerRef.current = setTimeout(finishCurrent, 3000);
  }

  function finishCurrent() {
    setCurrent(null);
    showingRef.current = false;
    queueRef.current._activeRef = null;
    pump();
  }

  if (!current) return null;

  const big = current.cost >= 400000; // Diamond Rain and up get the extra-large treatment

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center">
      <div className={`gift-popup flex items-center gap-2 rounded-2xl px-4 py-2 shadow-2xl gift-popup-${phase} ${big ? "gift-popup-big" : ""}`}>
        <span className={`gift-popup-icon ${big ? "text-4xl" : "text-3xl"}`}>{current.giftIcon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink">
            {current.fromName} <span className="font-normal text-ink/70">sent</span> {current.toName}
          </p>
          <p className="text-[11px] font-semibold text-gold">{current.giftName}</p>
        </div>
        {combo > 1 && <span className="gift-popup-combo shrink-0 text-lg font-black text-neon-pink">x{combo}</span>}
      </div>

      <style jsx>{`
        .gift-popup {
          background: linear-gradient(90deg, rgba(20, 10, 35, 0.92), rgba(60, 20, 70, 0.92));
          border: 1px solid rgba(255, 255, 255, 0.15);
          opacity: 0;
          transform: translateY(24px) scale(0.85);
        }
        .gift-popup-big {
          background: linear-gradient(90deg, rgba(80, 20, 10, 0.95), rgba(140, 60, 10, 0.95));
          box-shadow: 0 0 30px -4px rgba(255, 170, 40, 0.7);
        }
        .gift-popup-in {
          animation: giftIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .gift-popup-hold {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .gift-popup-out {
          animation: giftOut 0.5s ease-in forwards;
        }
        .gift-popup-icon {
          animation: giftIconPop 0.5s ease-out;
        }
        .gift-popup-combo {
          animation: comboPop 0.25s ease-out;
        }
        @keyframes giftIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes giftOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-16px) scale(0.9);
          }
        }
        @keyframes giftIconPop {
          0% {
            transform: scale(0.4) rotate(-15deg);
          }
          60% {
            transform: scale(1.25) rotate(8deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes comboPop {
          0% {
            transform: scale(1.6);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
