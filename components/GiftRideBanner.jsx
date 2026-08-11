"use client";

import { useEffect, useRef, useState } from "react";
import { listenGiftFeed } from "@/lib/gifts";

/**
 * Big TikTok-style gift animation: when someone sends a gift with a
 * `rideImage` (car, rocket, etc.) the vehicle drives/flies across the
 * WHOLE stage — bouncing, trailing sparkles, with a glow flash behind
 * it and bouncy name text — instead of just sliding a static picture
 * in a thin bar. Small gifts (rose, heart, ring, crown) stay in the
 * compact GiftFeed list and never reach this component.
 */
export default function GiftRideBanner({ roomId }) {
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out"
  const queueRef = useRef([]);
  const seenRef = useRef(new Set());
  const showingRef = useRef(false);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const unsub = listenGiftFeed(roomId, (gifts) => {
      const rides = gifts.filter((g) => g.giftImage);
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        rides.forEach((g) => seenRef.current.add(g.id));
        return;
      }
      for (const g of rides) {
        if (!seenRef.current.has(g.id)) {
          seenRef.current.add(g.id);
          queueRef.current.push(g);
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

    setTimeout(() => setPhase("hold"), 900);
    setTimeout(() => setPhase("out"), 3400);
    setTimeout(() => {
      setCurrent(null);
      showingRef.current = false;
      pump();
    }, 4100);
  }

  if (!current) return null;

  const sparkles = ["✨", "⭐", "💫", "✨", "⭐"];

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {/* Flash glow behind everything */}
      <div className="ride-flash absolute inset-0 bg-gradient-radial from-gold/30 via-transparent to-transparent" />

      <div className={`ride-track absolute top-1/2 flex -translate-y-1/2 flex-col items-center ride-${phase}`}>
        <div className="ride-vehicle-wrap relative">
          {/* Sparkle trail */}
          <div className="absolute right-full top-1/2 flex -translate-y-1/2 gap-1 pr-2">
            {sparkles.map((s, i) => (
              <span
                key={i}
                className="trail-sparkle text-lg"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {s}
              </span>
            ))}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.giftImage}
            alt=""
            className="ride-vehicle h-36 w-56 object-contain drop-shadow-[0_0_25px_rgba(245,195,77,0.65)]"
          />
        </div>

        <div className="ride-caption mt-2 rounded-full bg-black/60 px-5 py-2 text-center backdrop-blur">
          <p className="whitespace-nowrap text-base text-ink drop-shadow">
            <span className="font-bold">{current.fromName}</span>{" "}
            <span className="text-ink/80">sent</span>{" "}
            <span className="font-extrabold text-gold">{current.giftName}</span>{" "}
            <span className="text-ink/80">to</span>{" "}
            <span className="font-bold">{current.toName}</span> 🎉
          </p>
        </div>
      </div>

      <style jsx>{`
        .bg-gradient-radial {
          background-image: radial-gradient(circle at 50% 50%, var(--tw-gradient-stops));
        }
        .ride-flash {
          opacity: 0;
        }
        .ride-track {
          left: -60%;
        }
        .ride-in {
          animation: driveIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ride-in .ride-flash,
        .ride-hold .ride-flash {
          animation: flashPulse 1.2s ease-in-out infinite;
        }
        .ride-hold {
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .ride-out {
          animation: driveOut 0.7s cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }
        .ride-vehicle {
          animation: bob 0.6s ease-in-out infinite;
        }
        .ride-vehicle-wrap {
          animation: wobble 0.5s ease-in-out infinite;
        }
        .ride-caption {
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
        }
        .trail-sparkle {
          display: inline-block;
          animation: sparkleFade 0.9s ease-in-out infinite;
          opacity: 0;
        }
        @keyframes driveIn {
          from {
            left: -60%;
            transform: translateY(-50%) scale(0.85);
          }
          to {
            left: 50%;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
        @keyframes driveOut {
          from {
            left: 50%;
            transform: translate(-50%, -50%) scale(1.05);
          }
          to {
            left: 130%;
            transform: translateY(-50%) scale(0.85);
          }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-1.5deg); }
        }
        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1deg); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.4); }
          70% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes flashPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        @keyframes sparkleFade {
          0% { opacity: 0; transform: translateX(10px) scale(0.6); }
          40% { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(-18px) scale(0.6); }
        }
      `}</style>
    </div>
  );
}
