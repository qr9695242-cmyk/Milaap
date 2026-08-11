// Ludo game engine — pure logic, no Firebase/wallet dependency.
// Classic 4-player board: 52 shared track cells + 6-cell home stretch per
// color (57 steps total per token, same as the real board game).
// This is intentionally standalone from lib/wallet.js — it never reads or
// writes coins/diamonds. Local pass & play only (Phase 5 screenshot).

export const COLORS = ["red", "blue", "yellow", "green"];

export const COLOR_META = {
  red: { label: "Red", hex: "#E8433D", quadrant: "tl" },
  blue: { label: "Blue", hex: "#2E7DE1", quadrant: "tr" },
  yellow: { label: "Yellow", hex: "#F0B429", quadrant: "br" },
  green: { label: "Green", hex: "#2FA84F", quadrant: "bl" },
};

// 52-cell shared outer track, clockwise, as [row, col] on a 15x15 grid.
export const PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

// Index into PATH where each color's tokens enter the shared track.
export const START_INDEX = { red: 0, blue: 13, yellow: 26, green: 39 };

// Cells that are safe (no capture): every color's start cell plus the
// star cell 8 steps ahead of it.
export const SAFE_INDICES = new Set(
  COLORS.flatMap((c) => [START_INDEX[c], (START_INDEX[c] + 8) % 52])
);

// Home-stretch (6 cells) coordinates per color, ending just before center.
export const HOME_STRETCH = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

export const HOME_YARD_OFFSETS = [
  [1, 1], [1, 2], [2, 1], [2, 2],
];

// Top-left corner of each color's inner 4x4 "yard box" (where its 4 tokens
// sit before entering the board). Quadrants are 6x6; the outer ring of each
// quadrant is just colored border, so the inner box is inset by 1 cell.
export const YARD_ORIGIN = {
  red: [1, 1],
  blue: [1, 10],
  yellow: [10, 10],
  green: [10, 1],
};

export const FINISH_STEP = 57; // 51 shared cells (relative 0..50) + 6 home stretch (51..56) + center=57
export const HOME_ENTRY_STEP = 51; // relativePos >= 51 means off the shared track

export function createInitialTokens(activeColors) {
  const tokens = {};
  activeColors.forEach((color) => {
    tokens[color] = [0, 1, 2, 3].map((i) => ({
      id: `${color}-${i}`,
      color,
      relativePos: -1, // -1 = in yard, 0..50 = shared track, 51..56 = home stretch, 57 = finished
    }));
  });
  return tokens;
}

/** Board [row,col] for a token at a given relativePos, or null if in yard. */
export function cellForToken(color, relativePos) {
  if (relativePos < 0) return null;
  if (relativePos <= 50) {
    const globalIndex = (START_INDEX[color] + relativePos) % 52;
    return PATH[globalIndex];
  }
  if (relativePos <= 56) {
    return HOME_STRETCH[color][relativePos - 51];
  }
  return null; // finished, sits in center
}

export function isSafeCellForRelativePos(color, relativePos) {
  if (relativePos < 0 || relativePos > 50) return true; // yard + home stretch always safe
  const globalIndex = (START_INDEX[color] + relativePos) % 52;
  return SAFE_INDICES.has(globalIndex);
}

/** Which tokens can legally move this roll, given all players' token state. */
export function getMovableTokens(tokensByColor, color, diceValue) {
  const mine = tokensByColor[color];
  return mine.filter((t) => {
    if (t.relativePos === FINISH_STEP) return false;
    if (t.relativePos === -1) return diceValue === 6;
    return t.relativePos + diceValue <= FINISH_STEP;
  });
}

/**
 * Apply a move. Returns { tokensByColor, captured: [{color,id}], won: bool }
 * Does not mutate input.
 */
export function applyMove(tokensByColor, color, tokenId, diceValue) {
  const next = {};
  for (const c of Object.keys(tokensByColor)) {
    next[c] = tokensByColor[c].map((t) => ({ ...t }));
  }

  const token = next[color].find((t) => t.id === tokenId);
  if (!token) return { tokensByColor: next, captured: [], won: false };

  token.relativePos = token.relativePos === -1 ? 0 : token.relativePos + diceValue;

  const captured = [];
  if (token.relativePos <= 50) {
    const globalIndex = (START_INDEX[color] + token.relativePos) % 52;
    const landingSafe = SAFE_INDICES.has(globalIndex);
    if (!landingSafe) {
      for (const otherColor of Object.keys(next)) {
        if (otherColor === color) continue;
        const occupants = next[otherColor].filter((t) => {
          if (t.relativePos < 0 || t.relativePos > 50) return false;
          return (START_INDEX[otherColor] + t.relativePos) % 52 === globalIndex;
        });
        // Two-or-more of the same color on a cell form a block: can't capture.
        if (occupants.length === 1) {
          occupants[0].relativePos = -1;
          captured.push({ color: otherColor, id: occupants[0].id });
        }
      }
    }
  }

  const won = next[color].every((t) => t.relativePos === FINISH_STEP);
  return { tokensByColor: next, captured, won };
}

export function rollDice() {
  return 1 + Math.floor(Math.random() * 6);
}
