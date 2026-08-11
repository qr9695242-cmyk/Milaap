// Standard 100-square Snake & Ladder rules, classic board layout.
// Pure functions so the client UI (and, if ever needed, a server
// function) can share this exact logic — same pattern as checkersEngine.js.

export const BOARD_SIZE = 100;

// Classic snakes & ladders positions (start -> end).
export const LADDERS = { 2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98, 87: 94 };
export const SNAKES = { 16: 6, 46: 25, 49: 11, 62: 19, 64: 60, 74: 53, 89: 68, 92: 88, 95: 75, 99: 58 };

export function rollDice() {
  return 1 + Math.floor(Math.random() * 6);
}

/**
 * Applies a dice roll to a player's current position (0 = not started, 100 = won).
 * Returns { pos, jumped: 'ladder'|'snake'|null, extraTurn, won }.
 * - Must land exactly on 100; an overshoot roll doesn't move the piece.
 * - Rolling a 6 grants an extra turn (classic house rule), unless it wins the game.
 */
export function applyRoll(pos, roll) {
  let next = pos + roll;
  if (next > BOARD_SIZE) {
    // Overshoot — piece stays put, but a 6 still grants another roll.
    return { pos, jumped: null, extraTurn: roll === 6, won: false };
  }
  let jumped = null;
  if (LADDERS[next]) { next = LADDERS[next]; jumped = "ladder"; }
  else if (SNAKES[next]) { next = SNAKES[next]; jumped = "snake"; }
  const won = next === BOARD_SIZE;
  return { pos: next, jumped, extraTurn: !won && roll === 6, won };
}

/** Boustrophedon (snake-order) cell numbers for a 10x10 grid, row 0 = top (square 100..91). */
export function boardLayout() {
  const rows = [];
  for (let r = 9; r >= 0; r--) {
    const rowNumbers = [];
    for (let c = 0; c < 10; c++) rowNumbers.push(r * 10 + c + 1);
    if (r % 2 === 1) rowNumbers.reverse(); // odd rows (from bottom, 0-indexed) run right-to-left
    rows.push(rowNumbers);
  }
  return rows; // rows[0] is the visual top row (91-100), rows[9] is the bottom row (1-10)
}
