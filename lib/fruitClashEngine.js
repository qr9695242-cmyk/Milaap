// Real Fruit Clash engine (pure functions, no UI/Firebase).
// Each round deals a real 5x5 grid of fruits (seeded so both players get
// the identical board + target fruit) and picks one fruit type as the
// target. The player taps tiles under a real countdown; every tap is
// validated against the actual grid contents — correct-fruit taps score,
// wrong-fruit taps are penalized, and finishing with time left grants a
// genuine speed bonus (not a canned/random result).

export const FRUITS = ["🍉", "🍎", "🍊", "🍇", "🍓", "🍌"];
export const GRID_SIZE = 5; // 25 cells
export const ROUND_MS = 8000;
export const CORRECT_POINTS = 12;
export const WRONG_PENALTY = 6;

function seededRandom(seed) {
 let s = seed % 2147483647;
 if (s <= 0) s += 2147483646;
 return () => {
 s = (s * 16807) % 2147483647;
 return (s - 1) / 2147483646;
 };
}

/** Deterministic per-round grid so both players face the identical board. */
export function generateRound(seed) {
 const rand = seededRandom(Math.floor(seed * 1000) + 7);
 const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => FRUITS[Math.floor(rand() * FRUITS.length)]);
 const counts = {};
 for (const f of cells) counts[f] = (counts[f] || 0) + 1;
 // Target = the fruit with the most instances on this board (guarantees a
 // decent number of correct taps are actually available).
 const target = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
 return { cells, target, targetCount: counts[target] };
}

/**
 * Validates one tap against the real grid. `tapped` set holds indices
 * already tapped this round (so a cell can't be scored twice).
 */
export function evaluateTap(round, index, tapped) {
 if (tapped.has(index)) return { valid: false, delta: 0 };
 const isTarget = round.cells[index] === round.target;
 return { valid: true, correct: isTarget, delta: isTarget ? CORRECT_POINTS : -WRONG_PENALTY };
}

/** Speed bonus for clearing every target fruit with time to spare. */
export function speedBonus(timeLeftMs, cleared, total) {
 if (cleared < total) return 0;
 return Math.round((timeLeftMs / ROUND_MS) * 40);
}
