"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { ARROWS_PER_END, TOTAL_ENDS, scoreForPosition } from "@/lib/archeryEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const CYCLE_MS = 950;

export default function ArcheryPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needlePos, setNeedlePos] = useState(0);
  const [endShots, setEndShots] = useState([]);
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

  const totals = match?.totals || {};
  const endsDone = match?.endsDone || {};
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
  }, [phase, myTurn, endShots.length]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "archery", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "archery"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, {
      totals: { [p1.uid]: 0, [p2.uid]: 0 }, endsDone: { [p1.uid]: 0, [p2.uid]: 0 }, turnUid: p1.uid, setupDone: true,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  async function shootArrow() {
    if (!myTurn) return;
    const score = scoreForPosition(needlePos);
    const nextShots = [...endShots, score];
    setEndShots(nextShots);
    if (nextShots.length < ARROWS_PER_END) return;

    const endTotal = nextShots.reduce((a, b) => a + b, 0);
    const myTotal = (totals[user.uid] || 0) + endTotal;
    const myEnds = (endsDone[user.uid] || 0) + 1;
    try {
      const patch = {
        totals: { ...totals, [user.uid]: myTotal },
        endsDone: { ...endsDone, [user.uid]: myEnds },
        turnUid: opponent.uid,
      };
      const oppEnds = endsDone[opponent.uid] || 0;
      if (myEnds >= TOTAL_ENDS && oppEnds >= TOTAL_ENDS) {
        patch.status = "finished";
        const oppTotal = totals[opponent.uid] || 0;
        patch.winner = myTotal === oppTotal ? null : myTotal > oppTotal ? user.uid : opponent.uid;
      }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Shot save nahi hua."); }
    finally { setEndShots([]); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🏹 Archery</h1>
            <p className="text-sm text-mist">1v1 real-time • 3 ends of 3 arrows, highest total wins</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🏹</div>
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
            {phase === "finished"
              ? match.winner === user.uid ? "You won! 🏆" : match.winner === null ? "It's a draw" : "You lost"
              : myTurn ? "Your end" : "Opponent's end"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex items-center justify-between rounded-xl bg-panel px-4 py-3 ring-1 ring-white/10">
          <div className="text-center">
            <p className="text-[10px] text-mist">You — end {Math.min((endsDone[user.uid] || 0) + 1, TOTAL_ENDS)}/{TOTAL_ENDS}</p>
            <p className="font-display text-2xl font-black">{totals[user.uid] || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-mist">{opponent?.name} — end {Math.min((endsDone[opponent?.uid] || 0) + 1, TOTAL_ENDS)}/{TOTAL_ENDS}</p>
            <p className="font-display text-2xl font-black">{totals[opponent?.uid] || 0}</p>
          </div>
        </div>

        {phase === "playing" && (
          <div className="mx-5 mt-8">
            <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-full ring-2 ring-white/10">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/20 via-emerald-500/30 to-blue-500/50" />
              {[80, 60, 40, 20].map((r) => (
                <div key={r} className="absolute rounded-full border border-black/20" style={{ inset: `${(100 - r) / 2}%` }} />
              ))}
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
              {myTurn && (
                <div
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
                  style={{ left: `${50 + needlePos / 2}%`, top: "50%" }}
                />
              )}
            </div>

            <div className="mt-5 flex justify-center gap-1.5">
              {Array.from({ length: ARROWS_PER_END }).map((_, i) => (
                <span key={i} className={`h-2 w-8 rounded-full ${i < endShots.length ? "bg-teal-300" : "bg-white/15"}`} />
              ))}
            </div>

            <button
              disabled={!myTurn}
              onClick={shootArrow}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-40"
            >
              {myTurn ? `Shoot arrow ${endShots.length + 1}/${ARROWS_PER_END}` : "Opponent's turn…"}
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-8">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setEndShots([]); setPhase("setup"); }}
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
