"use client";

import { useState } from "react";
import { BACKGROUND_CATALOG } from "@/lib/backgrounds";
import { setRoomBackground } from "@/lib/rooms";

/** Small 🎨 button + bottom-sheet grid — host taps a swatch to change the room background live. */
export default function BackgroundPicker({ roomId, current }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(bg) {
    setBusy(true);
    try {
      await setRoomBackground(roomId, bg.id);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Change background"
        className="rounded-full bg-panel px-2.5 py-1.5 text-sm ring-1 ring-white/10"
      >
        🎨
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-panel p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-sm font-bold text-ink">Room Background</h2>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {BACKGROUND_CATALOG.map((bg) => (
                <button
                  key={bg.id}
                  disabled={busy}
                  onClick={() => pick(bg)}
                  className={`flex flex-col items-center gap-1 disabled:opacity-60`}
                >
                  <div
                    className={`h-12 w-12 rounded-xl ring-2 ${
                      current === bg.id ? "ring-neon-violet" : "ring-white/10"
                    }`}
                    style={{ background: bg.css }}
                  />
                  <span className="text-[9px] text-mist">{bg.name}</span>
                </button>
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
