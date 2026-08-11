const COLORS = ["red", "blue", "yellow", "green"];
const START_INDEX = { red: 0, blue: 13, yellow: 26, green: 39 };
const SAFE_INDICES = new Set(COLORS.flatMap((c) => [START_INDEX[c], (START_INDEX[c] + 8) % 52]));
const FINISH_STEP = 57;
function createInitialTokens(activeColors) {
  const tokens = {};
  activeColors.forEach((color) => {
    tokens[color] = [0,1,2,3].map((i) => ({ id: `${color}-${i}`, color, relativePos: -1 }));
  });
  return tokens;
}
function getMovableTokens(tokensByColor, color, diceValue) {
  return (tokensByColor[color] || []).filter((t) => {
    if (t.relativePos === FINISH_STEP) return false;
    if (t.relativePos === -1) return diceValue === 6;
    return t.relativePos + diceValue <= FINISH_STEP;
  });
}
function applyMove(tokensByColor, color, tokenId, diceValue) {
  const next = {};
  for (const c of Object.keys(tokensByColor)) next[c] = tokensByColor[c].map((t) => ({ ...t }));
  const token = (next[color] || []).find((t) => t.id === tokenId);
  if (!token) throw new Error("Invalid token");
  const legal = getMovableTokens(tokensByColor, color, diceValue).some((t) => t.id === tokenId);
  if (!legal) throw new Error("Invalid move");
  token.relativePos = token.relativePos === -1 ? 0 : token.relativePos + diceValue;
  if (token.relativePos <= 50) {
    const globalIndex = (START_INDEX[color] + token.relativePos) % 52;
    if (!SAFE_INDICES.has(globalIndex)) {
      for (const otherColor of Object.keys(next)) {
        if (otherColor === color) continue;
        const occupants = next[otherColor].filter((t) => t.relativePos >= 0 && t.relativePos <= 50 && ((START_INDEX[otherColor] + t.relativePos) % 52) === globalIndex);
        if (occupants.length === 1) occupants[0].relativePos = -1;
      }
    }
  }
  return { tokensByColor: next, won: next[color].every((t) => t.relativePos === FINISH_STEP) };
}
module.exports = { COLORS, FINISH_STEP, createInitialTokens, getMovableTokens, applyMove };
