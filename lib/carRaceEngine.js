// Real Car Race engine (pure functions, no UI/Firebase).
// Each of 5 segments has a randomly-placed "boost zone" on a 0-100 meter
// bar. A needle sweeps the bar in real time (driven by the client's actual
// elapsed time via performance.now()); the player's actual tap position is
// scored against the real zone geometry — not a canned/fixed result.
// Segment distance = base speed + boost bonus (closer to zone center =
// more bonus). Tapping before the "GO" signal is a false start (0m that
// segment). First to the finish distance — or most distance after all
// segments — wins.

export const SEGMENTS = 5;
export const FINISH_DISTANCE = 1000; // meters
export const BASE_DISTANCE = 120; // guaranteed distance per segment even on a miss
export const MAX_BONUS = 80; // extra distance for a perfect boost-zone hit

export function seededZone(seed) {
  // Deterministic-ish per segment so both players face the same zone.
  const r = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const start = 15 + r * 55; // keep the zone away from the very edges
  const width = 12;
  return { start, end: start + width, center: start + width / 2 };
}

/**
 * Scores one segment. `needlePos` is 0-100 (where the sweeping needle was
 * when the player tapped), `falseStart` is true if they tapped before GO.
 */
export function scoreSegment(needlePos, zone, falseStart) {
  if (falseStart) return { distance: 0, result: "false-start" };
  const inZone = needlePos >= zone.start && needlePos <= zone.end;
  const distFromCenter = Math.abs(needlePos - zone.center);
  if (inZone) {
    const closeness = 1 - distFromCenter / (zone.end - zone.start) / 2;
    const bonus = Math.round(MAX_BONUS * Math.max(0, Math.min(1, closeness)));
    return { distance: BASE_DISTANCE + bonus, result: bonus > MAX_BONUS * 0.75 ? "perfect-boost" : "boost" };
  }
  // Missed the zone — still moves, but only the base distance, scaled down
  // the further off the tap was.
  const penalty = Math.min(1, distFromCenter / 50);
  const distance = Math.round(BASE_DISTANCE * (1 - penalty * 0.5));
  return { distance: Math.max(20, distance), result: "miss" };
}
