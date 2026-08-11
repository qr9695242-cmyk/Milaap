"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { useAuth } from "@/lib/AuthContext";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECE_GLYPH = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
  P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔",
};

export default function ChessPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup"); // setup | searching | playing | finished
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // square like "e2"

  useEffect(() => {
    if (!matchId) return;
    return listenCasualMatch(matchId, (next) => {
      setMatch(next);
      if (!next) return;
      if (next.status === "waiting") setPhase("searching");
      else if (next.status === "playing") setPhase("playing");
      else if (next.status === "finished") setPhase("finished");
    }, (err) => setError(err.message || "Match sync error."));
  }, [matchId]);

  const chess = useMemo(() => {
    const c = new Chess();
    if (match?.fen) {
      try { c.load(match.fen); } catch { /* ignore corrupt fen, start fresh */ }
    }
    return c;
  }, [match?.fen]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  const myColor = match?.players?.find((p) => p.uid === user.uid)?.color;
  const myTurn = phase === "playing" && myColor && chess.turn() === myColor[0];

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const fresh = new Chess();
      const id = await quickMatchCasual({
        gameId: "chess",
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: { fen: fresh.fen(), lastMove: null },
      });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  // Assign colors once both players are present but colors aren't set yet.
  useEffect(() => {
    if (!match || match.status !== "playing" || match.colorsAssigned) return;
    if (match.hostUid !== user.uid) return; // only host assigns, avoids a race
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, {
      colorsAssigned: true,
      players: [{ ...p1, color: "w" }, { ...p2, color: "b" }],
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.colorsAssigned]);

  async function playMove(from, to) {
    if (!myTurn) return;
    setError("");
    try {
      const move = chess.move({ from, to, promotion: "q" });
      if (!move) { setSelected(null); return; }
      const finished = chess.isGameOver();
      const iWon = chess.isCheckmate(); // after my move, opponent has no legal reply
      await updateCasualMatch(matchId, {
        fen: chess.fen(),
        lastMove: { from, to },
        status: finished ? "finished" : "playing",
        winner: finished ? (iWon ? user.uid : null) : null,
      });
      setSelected(null);
    } catch {
      setSelected(null);
    }
  }

  function onSquareClick(square) {
    if (!myTurn) return;
    if (selected) {
      if (selected === square) { setSelected(null); return; }
      playMove(selected, square);
      return;
    }
    const piece = chess.get(square);
    if (piece && piece.color === myColor[0]) setSelected(square);
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">Chess</h1>
            <p className="text-sm text-mist">1v1 real-time • full rules, free to play</p>
          </div>
        </header>
        <div className="px-4">
          <button disabled={busy} onClick={startQuick} className="w-full rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60">
            ⚡ Quick Match
          </button>
          {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        </div>
      </main>
    );
  }

  if (phase === "searching") {
    return (
      <main className="min-h-screen bg-void text-ink flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">♟️</div>
          <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
          <button disabled={busy} onClick={cancel} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">
            {busy ? "Cancelling…" : "Cancel"}
          </button>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      </main>
    );
  }

  if (phase === "playing" || phase === "finished") {
    const board = chess.board(); // 8x8, board[0] = rank 8
    const opponent = match?.players?.find((p) => p.uid !== user.uid);

    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">
            {phase === "finished"
              ? match.winner ? (match.winner === user.uid ? "You won! 🏆" : "You lost") : "Draw"
              : chess.isCheck() ? "Check!" : myTurn ? "Your move" : "Opponent's move"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 grid grid-cols-8 overflow-hidden rounded-2xl ring-1 ring-white/10">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const square = `${FILES[c]}${8 - r}`;
              const dark = (r + c) % 2 === 1;
              const isSelected = selected === square;
              return (
                <button
                  key={square}
                  onClick={() => onSquareClick(square)}
                  className={`flex aspect-square items-center justify-center text-2xl ${
                    isSelected ? "bg-teal-400/60" : dark ? "bg-panel2" : "bg-panel"
                  }`}
                >
                  {cell ? PIECE_GLYPH[cell.color === "w" ? cell.type.toUpperCase() : cell.type] : ""}
                </button>
              );
            })
          )}
        </div>

        {phase === "finished" && (
          <div className="mx-4 mt-5">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setSelected(null); setPhase("setup"); }}
              className="w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black"
            >
              Play Again
            </button>
          </div>
        )}
        {error && <p className="mx-4 mt-3 text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  return null;
}
