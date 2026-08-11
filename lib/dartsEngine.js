// Real darts scoring mechanic: a needle sweeps 0 (bullseye, center of the
// board) to 100 (edge, miss) and back; tapping "Throw" locks it at whatever
// position it's at — genuine timing/precision skill, same input pattern the
// app already uses elsewhere, but scored on real dartboard-style rings.
// Game mode: classic 301 countdown, 3 darts per turn, must land on exactly
// 0 to win, and a turn that would take the score below 0 "busts" (voided).

export const START_SCORE = 301;
export const DARTS_PER_TURN = 3;

const RINGS = [
  { max: 4, score: 50, label: "Bullseye" },
  { max: 9, score: 25, label: "Outer bull" },
  { max: 24, score: 20, label: "Inner ring" },
  { max: 44, score: 15, label: "Mid ring" },
  { max: 64, score: 10, label: "Outer band" },
  { max: 84, score: 5, label: "Edge" },
  { max: 100, score: 0, label: "Miss" },
];

export function scoreForPosition(pos) {
  const clamped = Math.max(0, Math.min(100, pos));
  for (const r of RINGS) if (clamped <= r.max) return { score: r.score, label: r.label };
  return { score: 0, label: "Miss" };
}

/** Applies a completed 3-dart turn to a running score. Returns { score, busted, won }. */
export function applyTurn(currentScore, throwScores) {
  const total = throwScores.reduce((s, t) => s + t, 0);
  const remaining = currentScore - total;
  if (remaining < 0) return { score: currentScore, busted: true, won: false };
  return { score: remaining, busted: false, won: remaining === 0 };
}
