// Real mini golf: a 9-hole course with proper pars, played stroke-by-stroke.
// Each stroke uses the same needle-precision mechanic as the app's other
// arcade games — how close to dead-center you lock it determines whether
// the ball holes out. Fewest total strokes across all 9 holes wins, same
// as real golf scoring.

export const HOLES = [
  { par: 3 }, { par: 3 }, { par: 4 }, { par: 3 }, { par: 4 },
  { par: 3 }, { par: 5 }, { par: 3 }, { par: 4 },
];

const HOLE_THRESHOLD = 12; // needle within this of dead-center holes the ball out

export function isHoled(needlePos) {
  return needlePos <= HOLE_THRESHOLD;
}

export function totalStrokes(strokesArr) {
  return strokesArr.reduce((s, n) => s + n, 0);
}

export function totalPar(upToHoleCount) {
  return HOLES.slice(0, upToHoleCount).reduce((s, h) => s + h.par, 0);
}

export function relativeToPar(strokesArr) {
  const strokes = totalStrokes(strokesArr);
  const par = totalPar(strokesArr.length);
  const diff = strokes - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}
