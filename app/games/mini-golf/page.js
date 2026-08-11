"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { HOLES, isHoled, totalStrokes, relativeToPar } from "@/lib/miniGolfEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const CYCLE_MS = 1000;

export default function MiniGolfPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needlePos, setNeedlePos] = useState(0);
  const [strokeCount, setStrokeCount] = useState(0);
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

  const strokesMap = match?.strokes || {};
  const opponent = match?.players?.find((p) => p.uid !== user?.uid);
  const myHoles = strokesMap[user?.uid] || [];
  const oppHoles = opponent ? strokesMap[opponent.uid] || [] : [];
  const myHoleIndex = myHoles.length;
  const myTurn = phase === "playing" && match?.turnUid === user?.uid && myHoleIndex < HOLES.length;

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
  }, [phase, myTurn, myHoleIndex, strokeCount]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "mini-golf", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "mini-golf"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, { strokes: { [p1.uid]: [], [p2.uid]: [] }, turnUid: p1.uid, setupDone: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  async function putt() {
    if (!myTurn) return;
    const thisStroke = strokeCount + 1;
    if (!isHoled(needlePos)) { setStrokeCount(thisStroke); return; }

    const newHoles = [...myHoles, thisStroke];
    setStrokeCount(0);
    try {
      const patch = { strokes: { ...strokesMap, [user.uid]: newHoles } };
      const myDone = newHoles.length >= HOLES.length;
      const oppDone = oppHoles.length >= HOLES.length;
      if (myDone && oppDone) {
        patch.status = "finished";
        const myTotal = totalStrokes(newHoles);
        const oppTotal = totalStrokes(oppHoles);
        patch.winner = myTotal === oppTotal ? null : myTotal < oppTotal ? user.uid : opponent.uid; // fewer strokes wins
      } else if (oppDone) {
        patch.turnUid = user.uid;
      } else {
        patch.turnUid = opponent.uid;
      }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Putt save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">⛳ Mini Golf</h1>
            <p className="text-sm text-mist">1v1 real-time • 9-hole course, fewest strokes wins</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">⛳</div>
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
    const currentHole = HOLES[Math.min(myHoleIndex, HOLES.length - 1)];
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">
            {phase === "finished"
              ? match.winner === user.uid ? "You won! 🏆" : match.winner === null ? "It's a draw" : "You lost"
              : myTurn ? "Your shot" : "Opponent's shot"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex items-center justify-between rounded-xl bg-panel px-4 py-3 ring-1 ring-white/10">
          <div className="text-center">
            <p className="text-[10px] text-mist">You — {relativeToPar(myHoles)}</p>
            <p className="font-display text-2xl font-black">{totalStrokes(myHoles)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-mist">{opponent?.name} — {relativeToPar(oppHoles)}</p>
            <p className="font-display text-2xl font-black">{totalStrokes(oppHoles)}</p>
          </div>
        </div>

        {phase === "playing" && myHoleIndex < HOLES.length && (
          <div className="mx-5 mt-6">
            <p className="text-center text-xs text-mist">Hole {myHoleIndex + 1}/9 • Par {currentHole.par} • Stroke {strokeCount + 1}</p>
            <div className="relative mx-auto mt-3 aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-emerald-900/40 ring-1 ring-white/10">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-800/10" />
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-2 ring-white/40" />
              {myTurn && (
                <div
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
                  style={{ left: `${50 + needlePos / 2}%`, top: "50%" }}
                />
              )}
            </div>
            <button
              disabled={!myTurn}
              onClick={putt}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-40"
            >
              {myTurn ? "Putt" : "Opponent's turn…"}
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-6">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setStrokeCount(0); setPhase("setup"); }}
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
