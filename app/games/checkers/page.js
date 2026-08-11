"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { initialBoard, legalMoves, applyMove, countPieces } from "@/lib/checkersEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const GLYPH = { w: "⬤", b: "⬤" };

export default function CheckersPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // [r,c]

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

  const board = useMemo(() => match?.board || initialBoard(), [match?.board]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  const myColor = match?.players?.find((p) => p.uid === user.uid)?.color;
  const myTurn = phase === "playing" && myColor && match?.turnColor === myColor;
  const moves = useMemo(() => (myTurn ? legalMoves(board, myColor) : []), [board, myTurn, myColor]);

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: "checkers",
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: { board: initialBoard(), turnColor: "w" },
      });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "checkers"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.colorsAssigned) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, {
      colorsAssigned: true,
      players: [{ ...p1, color: "w" }, { ...p2, color: "b" }],
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.colorsAssigned]);

  async function onSquareClick(r, c) {
    if (!myTurn) return;
    if (selected) {
      const move = moves.find((m) => m.from[0] === selected[0] && m.from[1] === selected[1] && m.to[0] === r && m.to[1] === c);
      if (move) {
        const { board: nextBoard, chainAt } = applyMove(board, move);
        const opponentColor = myColor === "w" ? "b" : "w";
        const patch = { board: nextBoard };
        if (chainAt) {
          patch.turnColor = myColor; // same player must continue the capture chain
          setSelected(chainAt);
        } else {
          patch.turnColor = opponentColor;
          setSelected(null);
        }
        const oppLeft = countPieces(nextBoard, opponentColor);
        const oppMovesLeft = legalMoves(nextBoard, opponentColor).length;
        if (!chainAt && (oppLeft === 0 || oppMovesLeft === 0)) {
          patch.status = "finished";
          patch.winner = user.uid;
        }
        try { await updateCasualMatch(matchId, patch); }
        catch (e) { setError(e.message || "Move save nahi hua."); }
        return;
      }
      setSelected(null);
      return;
    }
    const piece = board[r][c];
    if (piece && piece.color === myColor && moves.some((m) => m.from[0] === r && m.from[1] === c)) setSelected([r, c]);
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">Checkers</h1>
            <p className="text-sm text-mist">1v1 real-time • mandatory captures, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🔴</div>
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
    const opponent = match?.players?.find((p) => p.uid !== user.uid);
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">
            {phase === "finished" ? (match.winner === user.uid ? "You won! 🏆" : "You lost") : myTurn ? "Your move" : "Opponent's move"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 grid grid-cols-8 overflow-hidden rounded-2xl ring-1 ring-white/10">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const dark = (r + c) % 2 === 1;
              const isSelected = selected && selected[0] === r && selected[1] === c;
              const isTarget = selected && moves.some((m) => m.from[0] === selected[0] && m.from[1] === selected[1] && m.to[0] === r && m.to[1] === c);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => onSquareClick(r, c)}
                  className={`flex aspect-square items-center justify-center text-xl ${
                    isSelected ? "bg-teal-400/60" : isTarget ? "bg-emerald-400/40" : dark ? "bg-panel2" : "bg-panel"
                  }`}
                >
                  {cell && (
                    <span className={cell.color === "w" ? "text-white" : "text-red-500"}>
                      {GLYPH[cell.color]}{cell.king ? "♛" : ""}
                    </span>
                  )}
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
