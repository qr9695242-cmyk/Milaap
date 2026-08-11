"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { pinsForPosition, frameStatus, computeScore, rollsByFrame } from "@/lib/bowlingEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const CYCLE_MS = 900;

function frameLabel(f) {
  if (f.length === 1 && f[0] === 10) return "X";
  if (f.length === 2 && f[0] + f[1] === 10) return `${f[0]}/`;
  return f.join(" ");
}

export default function BowlingPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needlePos, setNeedlePos] = useState(0);
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

  const rollsMap = match?.rolls || {};
  const opponent = match?.players?.find((p) => p.uid !== user?.uid);
  const myRolls = rollsMap[user?.uid] || [];
  const oppRolls = opponent ? rollsMap[opponent.uid] || [] : [];
  const myStatus = frameStatus(myRolls);
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
  }, [phase, myTurn, myRolls.length]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "bowling", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "bowling"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, { rolls: { [p1.uid]: [], [p2.uid]: [] }, turnUid: p1.uid, setupDone: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  async function bowl() {
    if (!myTurn || myStatus.isGameOver) return;
    const pins = pinsForPosition(needlePos, myStatus.pinsStanding);
    const newRolls = [...myRolls, pins];
    const newStatus = frameStatus(newRolls);
    const frameJustEnded = newStatus.frameIndex !== myStatus.frameIndex || newStatus.isGameOver;

    try {
      const patch = { rolls: { ...rollsMap, [user.uid]: newRolls } };
      if (frameJustEnded) {
        const oppStatus = frameStatus(oppRolls);
        if (newStatus.isGameOver && oppStatus.isGameOver) {
          patch.status = "finished";
          const myScore = computeScore(newRolls);
          const oppScore = computeScore(oppRolls);
          patch.winner = myScore === oppScore ? null : myScore > oppScore ? user.uid : opponent.uid;
        } else if (oppStatus.isGameOver) {
          patch.turnUid = user.uid; // opponent already finished all 10 frames — I keep going
        } else {
          patch.turnUid = opponent.uid;
        }
      }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Roll save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🎳 Bowling</h1>
            <p className="text-sm text-mist">1v1 real-time • official 10-frame scoring, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🎳</div>
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
    const myFrames = rollsByFrame(myRolls);
    const oppFrames = rollsByFrame(oppRolls);
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">
            {phase === "finished"
              ? match.winner === user.uid ? "You won! 🏆" : match.winner === null ? "It's a draw" : "You lost"
              : myTurn ? "Your roll" : "Opponent's roll"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 space-y-2">
          <div className="rounded-xl bg-panel p-2.5 ring-1 ring-white/10">
            <p className="mb-1 text-[10px] text-mist">You — frame {Math.min(myStatus.frameIndex + 1, 10)}/10 • score {computeScore(myRolls)}</p>
            <div className="flex gap-1 overflow-x-auto">
              {myFrames.map((f, i) => <span key={i} className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] font-bold">{frameLabel(f)}</span>)}
            </div>
          </div>
          <div className="rounded-xl bg-panel p-2.5 ring-1 ring-white/10">
            <p className="mb-1 text-[10px] text-mist">{opponent?.name} • score {computeScore(oppRolls)}</p>
            <div className="flex gap-1 overflow-x-auto">
              {oppFrames.map((f, i) => <span key={i} className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] font-bold">{frameLabel(f)}</span>)}
            </div>
          </div>
        </div>

        {phase === "playing" && (
          <div className="mx-5 mt-6">
            <p className="mb-2 text-center text-xs text-mist">Pins standing: {myStatus.pinsStanding}</p>
            <div className="relative mx-auto h-16 w-full max-w-xs overflow-hidden rounded-xl bg-panel ring-1 ring-white/10">
              <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-emerald-500/40 via-yellow-400/40 to-red-500/40" />
              {myTurn && (
                <div className="absolute top-0 h-full w-1 bg-white shadow-lg" style={{ left: `${needlePos}%` }} />
              )}
            </div>
            <button
              disabled={!myTurn}
              onClick={bowl}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-40"
            >
              {myTurn ? "Roll ball" : "Opponent's turn…"}
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-6">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setPhase("setup"); }}
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
