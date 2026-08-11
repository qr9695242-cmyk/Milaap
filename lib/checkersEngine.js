// Standard American checkers rules: 8x8, dark squares only, mandatory
// captures, kinging on the back row. Pure functions so both the client
// UI and (if ever needed) a server function can share this exact logic.

export function initialBoard() {
  // board[r][c] = null | { color: 'b'|'w', king: bool }. Row 0 = top.
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = { color: "b", king: false };
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = { color: "w", king: false };
  return b;
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function pieceMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return { simple: [], captures: [] };
  const dirs = piece.king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : piece.color === "w" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  const simple = [];
  const captures = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && !board[nr][nc]) simple.push({ to: [nr, nc] });
    const jr = r + dr * 2, jc = c + dc * 2;
    if (inBounds(nr, nc) && inBounds(jr, jc) && board[nr][nc] && board[nr][nc].color !== piece.color && !board[jr][jc]) {
      captures.push({ to: [jr, jc], capture: [nr, nc] });
    }
  }
  return { simple, captures };
}

/** All legal moves for `color`. If any capture exists anywhere on the board, only captures are legal (mandatory capture rule). */
export function legalMoves(board, color) {
  let anyCapture = false;
  const all = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;
      const { simple, captures } = pieceMoves(board, r, c);
      if (captures.length) anyCapture = true;
      for (const m of captures) all.push({ from: [r, c], ...m, isCapture: true });
      for (const m of simple) all.push({ from: [r, c], ...m, isCapture: false });
    }
  }
  return anyCapture ? all.filter((m) => m.isCapture) : all;
}

/** Applies a move (from legalMoves) and returns a new board + whether the mover gets to chain another capture. */
export function applyMove(board, move) {
  const next = board.map((row) => row.slice());
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = { ...next[fr][fc] };
  next[fr][fc] = null;
  if (move.isCapture) {
    const [cr, cc] = move.capture;
    next[cr][cc] = null;
  }
  if ((piece.color === "w" && tr === 0) || (piece.color === "b" && tr === 7)) piece.king = true;
  next[tr][tc] = piece;

  let chain = false;
  if (move.isCapture) {
    const { captures } = pieceMoves(next, tr, tc);
    chain = captures.length > 0;
  }
  return { board: next, chainAt: chain ? [tr, tc] : null };
}

export function countPieces(board, color) {
  let n = 0;
  for (const row of board) for (const cell of row) if (cell && cell.color === color) n++;
  return n;
}
