"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { START_SCORE, DARTS_PER_TURN, scoreForPosition, applyTurn } from "@/lib/dartsEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const CYCLE_MS = 1100;

export default function DartsPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needlePos, setNeedlePos] = useState(0);
  const [turnThrows, setTurnThrows] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const rafRef = useRef(null);
  const startRef = useRef(0);

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

  const scores = match?.scores || {};
  const opponent = match?.players?.find((p) => p.uid !== user?.uid);
  const myTurn = phase === "playing" && match?.turnUid === user?.uid;

  useEffect(() => {
    if (phase !== "playing" || !myTurn) return;
    startRef.current = performance.now();
    function tick(now) {
      const t = ((now - startRef.current) % CYCLE_MS) / CYCLE_MS;
      setNeedlePos(t < 0.5 ? t * 2 * 100 : (1 - t) * 2 * 100);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, myTurn, turnThrows.length]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "darts", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "darts"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, {
      scores: { [p1.uid]: START_SCORE, [p2.uid]: START_SCORE }, turnUid: p1.uid, setupDone: true,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  async function throwDart() {
    if (!myTurn) return;
    const { score } = scoreForPosition(needlePos);
    const nextThrows = [...turnThrows, score];
    setTurnThrows(nextThrows);
    if (nextThrows.length < DARTS_PER_TURN) return;

    const myScore = scores[user.uid] ?? START_SCORE;
    const result = applyTurn(myScore, nextThrows);
    setLastResult({ throws: nextThrows, ...result });
    try {
      const patch = { scores: { ...scores, [user.uid]: result.score }, turnUid: opponent.uid };
      if (result.won) { patch.status = "finished"; patch.winner = user.uid; }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Throw save nahi hua."); }
    finally { setTurnThrows([]); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🎯 Darts</h1>
            <p className="text-sm text-mist">1v1 real-time • classic 301, 3 darts a turn, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🎯</div>
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
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">
            {phase === "finished" ? (match.winner === user.uid ? "You won! 🏆" : "You lost") : myTurn ? "Your throw" : "Opponent's throw"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex items-center justify-between rounded-xl bg-panel px-4 py-3 ring-1 ring-white/10">
          <div className="text-center">
            <p className="text-[10px] text-mist">You</p>
            <p className="font-display text-2xl font-black">{scores[user.uid] ?? START_SCORE}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-mist">{opponent?.name}</p>
            <p className="font-display text-2xl font-black">{scores[opponent?.uid] ?? START_SCORE}</p>
          </div>
        </div>

        {phase === "playing" && (
          <div className="mx-5 mt-8">
            {/* Concentric dartboard rings; the needle position marks how close to bullseye. */}
            <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-full ring-2 ring-white/10">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/70 via-yellow-400/50 to-emerald-500/40" />
              {[85, 65, 45, 25, 10, 5].map((r) => (
                <div key={r} className="absolute rounded-full border border-black/20" style={{ inset: `${r / 2}%` }} />
              ))}
              {myTurn && (
                <div
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
                  style={{ left: `${50 + needlePos / 2}%`, top: "50%" }}
                />
              )}
            </div>

            <div className="mt-5 flex justify-center gap-1.5">
              {Array.from({ length: DARTS_PER_TURN }).map((_, i) => (
                <span key={i} className={`h-2 w-8 rounded-full ${i < turnThrows.length ? "bg-teal-300" : "bg-white/15"}`} />
              ))}
            </div>

            <button
              disabled={!myTurn}
              onClick={throwDart}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-40"
            >
              {myTurn ? `Throw dart ${turnThrows.length + 1}/${DARTS_PER_TURN}` : "Opponent's turn…"}
            </button>

            {lastResult && (
              <p className="mt-3 text-center text-xs text-mist">
                Last turn: {lastResult.throws.join(" + ")} {lastResult.busted ? "— bust! Score unchanged" : `= ${lastResult.throws.reduce((a, b) => a + b, 0)} pts`}
              </p>
            )}
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-8">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setTurnThrows([]); setLastResult(null); setPhase("setup"); }}
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
