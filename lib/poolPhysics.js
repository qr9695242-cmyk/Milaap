// Shared 2D physics for the billiards-style games (8 Ball Pool, Carrom).
// Real elastic collision physics on a rectangular table: friction
// deceleration, wall rebounds, equal-mass ball-ball collisions, and pocket
// capture. A shot is simulated forward in small fixed timesteps until
// everything settles, then the final state is what gets synced — this
// keeps the real-time multiplayer sync cheap (one Firestore write per shot,
// not per frame) while the physics itself is genuine, not scripted.

export const FRICTION = 0.985; // per-step velocity retention
export const MIN_SPEED = 0.03; // below this, a ball is considered stopped
export const BALL_RADIUS = 2.2; // in table-percentage units (table is 0-100 x 0-100... see per-game scale)

export function stepPhysics(balls, table) {
  const next = balls.map((b) => ({ ...b }));

  // Move + friction
  for (const b of next) {
    if (b.potted) continue;
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= FRICTION;
    b.vy *= FRICTION;
    if (Math.hypot(b.vx, b.vy) < MIN_SPEED) { b.vx = 0; b.vy = 0; }
  }

  // Wall rebounds
  for (const b of next) {
    if (b.potted) continue;
    if (b.x - b.r < 0) { b.x = b.r; b.vx *= -1; }
    if (b.x + b.r > table.w) { b.x = table.w - b.r; b.vx *= -1; }
    if (b.y - b.r < 0) { b.y = b.r; b.vy *= -1; }
    if (b.y + b.r > table.h) { b.y = table.h - b.r; b.vy *= -1; }
  }

  // Ball-ball elastic collisions (equal mass -> velocities exchange along the normal)
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i], b = next[j];
      if (a.potted || b.potted) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.r + b.r;
      if (dist > 0 && dist < minDist) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const relVx = a.vx - b.vx, relVy = a.vy - b.vy;
        const sep = relVx * nx + relVy * ny;
        if (sep > 0) {
          a.vx -= sep * nx; a.vy -= sep * ny;
          b.vx += sep * nx; b.vy += sep * ny;
        }
      }
    }
  }

  // Pocket capture
  for (const b of next) {
    if (b.potted) continue;
    for (const p of table.pockets) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < table.pocketRadius) { b.potted = true; b.vx = 0; b.vy = 0; }
    }
  }

  return next;
}

export function isSettled(balls) {
  return balls.every((b) => b.potted || (b.vx === 0 && b.vy === 0));
}

/** Runs the shot forward until everything stops (or a max step cap, as a safety valve). */
export function simulateShot(initialBalls, table, maxSteps = 1200) {
  let balls = initialBalls;
  const wasPotted = new Set(balls.filter((b) => b.potted).map((b) => b.id));
  for (let i = 0; i < maxSteps; i++) {
    balls = stepPhysics(balls, table);
    if (isSettled(balls)) break;
  }
  const newlyPotted = balls.filter((b) => b.potted && !wasPotted.has(b.id)).map((b) => b.id);
  return { balls, newlyPotted };
}
