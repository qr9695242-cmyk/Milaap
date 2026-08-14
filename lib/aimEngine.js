// Shared 2D aim geometry + physics for the target/board mini-games.
// Every score here is derived from actual geometry (distance to a target,
// ring/segment lookups, or a simulated collision) driven by the player's
// real angle+power input — not a canned formula that ignores the input.

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function distance(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

export function angleToVector(deg) {
 const rad = (deg * Math.PI) / 180;
 return { dx: Math.cos(rad), dy: Math.sin(rad) };
}

// Shortest distance from point (px,py) to the segment (x1,y1)-(x2,y2), plus
// the closest point on that segment (used for collision detection).
export function pointToSegment(px, py, x1, y1, x2, y2) {
 const dx = x2 - x1, dy = y2 - y1;
 const lenSq = dx * dx + dy * dy;
 let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
 t = clamp(t, 0, 1);
 const cx = x1 + t * dx, cy = y1 + t * dy;
 return { dist: distance(px, py, cx, cy), x: cx, y: cy, t };
}

// ---------- Archery: 10 concentric rings, bullseye = ring 10 ----------
export function archeryScore(landX, landY, center, boardRadius) {
 const d = distance(landX, landY, center.x, center.y);
 if (d > boardRadius) return { ring: 0, points: 0 };
 const ringWidth = boardRadius / 10;
 const ring = clamp(10 - Math.floor(d / ringWidth), 0, 10);
 return { ring, points: ring * 10 }; // out of 100, matches the app's round scale
}

// ---------- Darts: real dartboard segment order + ring multipliers ----------
export const DARTBOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export function dartScore(landX, landY, center, boardRadius) {
 const d = distance(landX, landY, center.x, center.y);
 if (d > boardRadius) return { segment: null, ring: "miss", points: 0 };
 const bullR = boardRadius * 0.05, outerBullR = boardRadius * 0.12;
 const tripleInner = boardRadius * 0.60, tripleOuter = boardRadius * 0.68;
 const doubleInner = boardRadius * 0.94, doubleOuter = boardRadius;
 if (d <= bullR) return { segment: 25, ring: "bullseye", points: 50 };
 if (d <= outerBullR) return { segment: 25, ring: "outer-bull", points: 25 };
 let angle = (Math.atan2(landY - center.y, landX - center.x) * 180) / Math.PI;
 angle = (angle + 90 + 360 + 9) % 360; // rotate so segment 20 is centered at top
 const idx = Math.floor(angle / 18) % 20;
 const segment = DARTBOARD_ORDER[idx];
 if (d >= tripleInner && d <= tripleOuter) return { segment, ring: "triple", points: segment * 3 };
 if (d >= doubleInner && d <= doubleOuter) return { segment, ring: "double", points: segment * 2 };
 return { segment, ring: "single", points: segment };
}

// ---------- Carrom: real (simplified) collision + friction glide ----------
/**
 * Simulates one carrom strike. The striker travels in a straight line from
 * `strikerPos` for `power`% of `maxTravel`. If that line passes within
 * collision range of the coin, momentum carries the coin further along the
 * same line (scaled down for friction + how glancing the hit was); if the
 * coin's final rest position lands inside a pocket, it's potted.
 */
export function simulateCarromShot({ strikerPos, angleDeg, power, coinPos, pockets, coinRadius = 12, strikerRadius = 10, pocketRadius = 18, maxTravel = 420 }) {
 const { dx, dy } = angleToVector(angleDeg);
 const travel = (clamp(power, 0, 100) / 100) * maxTravel;
 const endX = strikerPos.x + dx * travel;
 const endY = strikerPos.y + dy * travel;
 const hit = pointToSegment(coinPos.x, coinPos.y, strikerPos.x, strikerPos.y, endX, endY);
 const collisionRange = coinRadius + strikerRadius;
 if (hit.dist > collisionRange) {
 return { potted: false, hit: false, coinFinal: coinPos, reason: "Striker coin ko miss kar gaya." };
 }
 // How central the hit was (1 = dead-center, 0 = just grazing) scales energy transfer.
 const centrality = 1 - hit.dist / collisionRange;
 const remainingPower = clamp(power, 0, 100) * (0.35 + 0.5 * centrality); // friction + glancing loss
 const glideDist = (remainingPower / 100) * maxTravel * 0.6;
 const coinFinal = { x: coinPos.x + dx * glideDist, y: coinPos.y + dy * glideDist };
 const pocket = (pockets || []).find((p) => distance(coinFinal.x, coinFinal.y, p.x, p.y) <= pocketRadius);
 return { potted: !!pocket, hit: true, coinFinal, pocket: pocket || null, reason: pocket ? "Pocket!" : "Coin hit hui lekin pocket nahi hui." };
}

// ---------- Mini Golf: putt with friction glide toward a hole ----------
export function simulatePutt({ startPos, angleDeg, power, holePos, holeRadius = 10, ballRadius = 6, maxTravel = 260 }) {
 const { dx, dy } = angleToVector(angleDeg);
 const travel = (clamp(power, 0, 100) / 100) * maxTravel;
 const ballFinal = { x: startPos.x + dx * travel, y: startPos.y + dy * travel };
 const d = distance(ballFinal.x, ballFinal.y, holePos.x, holePos.y);
 const inHole = d <= holeRadius + ballRadius * 0.4;
 return { inHole, ballFinal, distanceToHole: d };
}

// ---------- Bowling: straight-line ball path vs a triangular pin rack ----------
export function simulateBowling({ startX, laneTop, laneBottom, curveDeg = 0, pins, ballRadius = 9, pinRadius = 7 }) {
 const endX = startX + Math.tan((curveDeg * Math.PI) / 180) * (laneBottom - laneTop);
 const knocked = (pins || []).filter((p) => pointToSegment(p.x, p.y, startX, laneBottom, endX, laneTop).dist <= ballRadius + pinRadius);
 return { knocked, count: knocked.length, endX };
}
