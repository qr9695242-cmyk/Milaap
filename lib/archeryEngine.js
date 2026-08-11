// Real archery scoring: same needle-precision input as darts, but scored on
// a standard 10-ring target (10 = bullseye down to 1, miss = 0) and played
// as an accumulating point race rather than a countdown — 3 arrows per end,
// 3 ends per player, highest total after both finish wins.

export const ARROWS_PER_END = 3;
export const TOTAL_ENDS = 3;

export function scoreForPosition(pos) {
  const clamped = Math.max(0, Math.min(99.999, pos));
  const band = Math.floor(clamped / 10); // 0..9
  return 10 - band; // 10 (bullseye) down to 1 (outer edge)
}
