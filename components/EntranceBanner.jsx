"use client";

import { useEffect, useRef, useState } from "react";
import { listenEntranceFeed } from "@/lib/rooms";

/**
 * Real "entry effect" like Bigo/TikTok-style rooms: a glowing bar slides
 * in from the left edge, crosses the screen, and slides back out —
 * showing the vehicle art (if equipped) or just a plain "joined the
 * room" for everyone else. Queued so entrances never overlap.
 */
export default function EntranceBanner({ roomId }) {
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out"
  const queueRef = useRef([]);
  const seenRef = useRef(new Set());
  const showingRef = useRef(false);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const unsub = listenEntranceFeed(roomId, (entrances) => {
      // Don't replay everyone who was already in the room before we mounted
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        entrances.forEach((e) => seenRef.current.add(e.id));
        return;
      }
      for (const e of entrances) {
        if (!seenRef.current.has(e.id)) {
          seenRef.current.add(e.id);
          queueRef.current.push(e);
        }
      }
      pump();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function pump() {
    if (showingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    showingRef.current = true;
    setCurrent(next);
    setPhase("in");

    setTimeout(() => setPhase("hold"), 500);
    setTimeout(() => setPhase("out"), 3200);
    setTimeout(() => {
      setCurrent(null);
      showingRef.current = false;
      pump();
    }, 3700);
  }

  if (!current) return null;

  const hasRide = !!current.vehicleImage;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-16 z-30 h-16 overflow-hidden">
      <div
        className={`entrance-bar absolute top-0 flex h-14 items-center gap-3 rounded-r-full py-1.5 pl-1.5 pr-6 shadow-lg ${
          hasRide
            ? "bg-gradient-to-r from-neon-violet/90 via-neon-pink/80 to-transparent"
            : "bg-gradient-to-r from-black/70 to-transparent"
        } entrance-${phase}`}
      >
        {hasRide ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.vehicleImage}
            alt=""
            className="h-12 w-20 rounded-full object-cover ring-2 ring-white/50"
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-panel2 text-lg ring-2 ring-white/30">
            👋
          </span>
        )}
        <p className="whitespace-nowrap text-sm text-ink drop-shadow">
          <span className="font-bold">{current.name}</span>{" "}
          {hasRide ? (
            <>
              <span className="text-ink/80">rides in on</span>{" "}
              <span className="font-bold text-gold">{current.vehicleName}</span> 🎉
            </>
          ) : (
            <span className="text-ink/80">joined the room</span>
          )}
        </p>
      </div>

      <style jsx>{`
        .entrance-bar {
          left: -100%;
        }
        .entrance-in {
          animation: slideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .entrance-hold {
          left: 0;
        }
        .entrance-out {
          animation: slideOut 0.5s cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }
        @keyframes slideIn {
          from {
            left: -100%;
          }
          to {
            left: 0;
          }
        }
        @keyframes slideOut {
          from {
            left: 0;
          }
          to {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
