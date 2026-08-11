"use client";

// Renders whatever hearts are currently in flight over the video stage.
// Purely local/decorative (not synced to other viewers) — each tap just
// spawns a heart that floats up and fades, like the ambient hearts in
// the reference design. Parent owns the `hearts` array + spawn logic
// (see useFloatingHearts below) so multiple triggers (tap button, big
// gifts, etc.) can all feed the same overlay.
export default function FloatingHearts({ hearts }) {
  if (!hearts.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="animate-float-heart absolute bottom-16 text-2xl"
          style={{ left: `${h.x}%` }}
        >
          {h.emoji}
        </span>
      ))}
    </div>
  );
}
