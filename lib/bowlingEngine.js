// Real 10-frame bowling: standard strike/spare bonus scoring, 10th frame
// bonus-roll rules. Pins knocked per roll come from the same needle-
// precision mechanic used elsewhere in the app (0 = dead-center strike
// line, sweeping out to a full miss), scaled to however many pins are
// still standing. Pure functions — no stored derived state, everything is
// computed from the flat list of rolls (same style as checkersEngine.js).

export function pinsForPosition(pos, pinsStanding) {
  const clamped = Math.max(0, Math.min(99.999, pos));
  const band = Math.floor(clamped / 10); // 0..9
  const raw = 10 - band; // 10 (perfect) down to 1, edge band = 1
  const pins = clamped >= 90 ? 0 : raw; // outermost band = miss
  return Math.min(pinsStanding, Math.max(0, pins));
}

/**
 * Given a flat roll history, figures out where the player currently stands:
 * which frame (0-9), which roll within that frame, how many pins are still
 * up, and whether their game is over. Handles the 10th frame's bonus rolls.
 */
export function frameStatus(rolls) {
  let i = 0;
  for (let frame = 0; frame < 9; frame++) {
    const r1 = rolls[i];
    if (r1 === undefined) return { frameIndex: frame, rollInFrame: 0, pinsStanding: 10, isGameOver: false };
    if (r1 === 10) { i += 1; continue; } // strike — frame over, on to the next
    const r2 = rolls[i + 1];
    if (r2 === undefined) return { frameIndex: frame, rollInFrame: 1, pinsStanding: 10 - r1, isGameOver: false };
    i += 2;
  }
  // 10th frame (index 9): up to 3 rolls if a strike or spare was thrown.
  const r1 = rolls[i], r2 = rolls[i + 1], r3 = rolls[i + 2];
  if (r1 === undefined) return { frameIndex: 9, rollInFrame: 0, pinsStanding: 10, isGameOver: false };
  if (r1 === 10) {
    if (r2 === undefined) return { frameIndex: 9, rollInFrame: 1, pinsStanding: 10, isGameOver: false };
    if (r3 === undefined) return { frameIndex: 9, rollInFrame: 2, pinsStanding: r2 === 10 ? 10 : 10 - r2, isGameOver: false };
    return { frameIndex: 9, rollInFrame: 3, pinsStanding: 0, isGameOver: true };
  }
  if (r2 === undefined) return { frameIndex: 9, rollInFrame: 1, pinsStanding: 10 - r1, isGameOver: false };
  if (r1 + r2 === 10) {
    if (r3 === undefined) return { frameIndex: 9, rollInFrame: 2, pinsStanding: 10, isGameOver: false };
    return { frameIndex: 9, rollInFrame: 3, pinsStanding: 0, isGameOver: true };
  }
  return { frameIndex: 9, rollInFrame: 2, pinsStanding: 0, isGameOver: true };
}

/** Official scoring: strikes get the next 2 rolls as bonus, spares get the next 1. */
export function computeScore(rolls) {
  let total = 0, i = 0;
  for (let frame = 0; frame < 10; frame++) {
    if (rolls[i] === 10) {
      total += 10 + (rolls[i + 1] || 0) + (rolls[i + 2] || 0);
      i += 1;
    } else {
      const two = (rolls[i] || 0) + (rolls[i + 1] || 0);
      total += two === 10 ? 10 + (rolls[i + 2] || 0) : two;
      i += 2;
    }
  }
  return total;
}

/** Groups a flat roll list into per-frame arrays, for display (e.g. "7, /" or "X"). */
export function rollsByFrame(rolls) {
  const frames = [];
  let i = 0;
  for (let frame = 0; frame < 9; frame++) {
    if (rolls[i] === undefined) break;
    if (rolls[i] === 10) { frames.push([10]); i += 1; }
    else if (rolls[i + 1] !== undefined) { frames.push([rolls[i], rolls[i + 1]]); i += 2; }
    else { frames.push([rolls[i]]); i += 1; }
  }
  if (rolls[i] !== undefined) frames.push(rolls.slice(i));
  return frames;
}
