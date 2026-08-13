"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listenEntranceFeed } from "@/lib/rooms";

/**
 * Real "entry effect" like Bigo/TikTok-style rooms.
 *
 * - Vehicle entrance WITH a video attached: full-screen takeover — the
 *   video plays across the whole mobile screen (like Bigo's big car/ride
 *   entrance animations) with the name overlaid, then fades out.
 * - Vehicle entrance with only a static image, or no vehicle at all: the
 *   original lightweight glowing bar that slides in from the left edge,
 *   crosses the screen, and slides back out.
 *
 * Queued so entrances never overlap.
 */
export default function EntranceBanner({ roomId }) {
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState("in"); // "in" | "hold" | "out"
  const queueRef = useRef([]);
  const seenRef = useRef(new Set());
  const showingRef = useRef(false);
  const firstLoadRef = useRef(true);
  const dismissTimerRef = useRef(null);

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

    if (next.vehicleVideo) {
      // Full-screen video takeover: hold for up to 5s, or until the video
      // finishes (handled by onEnded below), whichever comes first.
      dismissTimerRef.current = setTimeout(() => finishFullscreen(), 5000);
    } else {
      setTimeout(() => setPhase("hold"), 500);
      setTimeout(() => setPhase("out"), 3200);
      setTimeout(() => {
        setCurrent(null);
        showingRef.current = false;
        pump();
      }, 3700);
    }
  }

  function finishFullscreen() {
    clearTimeout(dismissTimerRef.current);
    setCurrent(null);
    showingRef.current = false;
    pump();
  }

  if (!current) return null;

  const hasRide = !!(current.vehicleVideo || current.vehicleImage);

  // Full-screen takeover for video vehicle entrances.
  // IMPORTANT: render into document.body so the overlay is never clipped by
  // the room's rounded/overflow-hidden video container. This makes the ride
  // entrance cover the entire phone viewport, like Bigo-style entry effects.
  if (current.vehicleVideo) {
    const fullscreen = (
      <div
        className="entrance-fullscreen pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        style={{
          width: "100vw",
          height: "100dvh",
          minHeight: "100vh",
          paddingTop: "env(safe-area-inset-top)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
        }}
        role="dialog"
        aria-label="Vehicle entrance"
      >
        <video
          src={current.vehicleVideo}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={finishFullscreen}
          onError={finishFullscreen}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] flex justify-center px-5">
          <p className="rounded-full bg-black/55 px-5 py-2 text-center text-base text-white drop-shadow-lg backdrop-blur-md">
            <span className="font-bold">{current.name}</span>{" "}
            <span className="text-white/80">rides in on</span>{" "}
            <span className="font-bold text-gold">{current.vehicleName}</span> 🎉
          </p>
        </div>
        <style jsx>{`
          .entrance-fullscreen {
            animation: fadeIn 0.22s ease-out both;
            overscroll-behavior: none;
          }
          .entrance-fullscreen video {
            display: block;
            max-width: none;
            max-height: none;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
    return typeof document !== "undefined" ? createPortal(fullscreen, document.body) : null;
  }

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
        ) : current.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.avatar}
            alt={current.name || "User"}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-white/30"
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
            <span className="text-ink/80">joined the room • everyone can see this</span>
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
