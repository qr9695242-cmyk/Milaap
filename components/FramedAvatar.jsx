"use client";

import { findItem } from "@/lib/decorations";

/**
 * Circle avatar (photo or initial) with the equipped frame image overlaid
 * as a ring around it. The frame PNGs are chroma-keyed transparent in the
 * middle so the avatar shows through — size the frame a bit bigger than
 * the avatar circle so the ring sits outside it.
 */
export default function FramedAvatar({ frameId, name, photoURL, size = 56, ring = true }) {
  const frame = frameId ? findItem("frame", frameId) : null;
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0 avatar-premium" style={{ width: size, height: size }}>
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-panel2 text-ink ${ring ? "ring-1 ring-white/10" : ""}`}
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
      {frame?.video ? (
        <video
          src={frame.video}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
          style={{ width: size * 1.82, height: size * 1.82, objectFit: "contain" }}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        frame?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame.image}
            alt=""
            // Frame PNGs aren't all square (e.g. 256x157) — forcing equal
            // width/height with no object-fit stretched them, distorting
            // the art. object-fit: contain keeps each frame's real aspect
            // ratio and centers it in the same bounding box.
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ width: size * 1.82, height: size * 1.82, objectFit: "contain" }}
            draggable={false}
          />
        )
      )}
    </div>
  );
}
