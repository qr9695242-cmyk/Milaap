"use client";

import { findItem } from "@/lib/decorations";

/**
 * Circle avatar (photo or initial) with the equipped frame image overlaid
 * as a ring around it. Frame PNGs are now pre-processed to be square with
 * the hole centered (see public/frames/), so a plain equal width/height
 * overlay lines up correctly — object-contain is kept as a safety net in
 * case a future frame asset isn't perfectly square.
 */
export default function FramedAvatar({ frameId, name, photoURL, size = 56, ring = true }) {
  const frame = frameId ? findItem("frame", frameId) : null;
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-panel2 text-ink ${
          ring ? "ring-1 ring-white/10" : ""
        }`}
      >
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoURL} alt={name || "avatar"} className="h-full w-full object-cover" />
        ) : (
          <span className="font-bold" style={{ fontSize: size * 0.4 }}>
            {initial}
          </span>
        )}
      </div>
      {frame?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame.image}
          alt=""
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none object-contain"
          style={{ width: size * 1.6, height: size * 1.6 }}
          draggable={false}
        />
      )}
    </div>
  );
}
