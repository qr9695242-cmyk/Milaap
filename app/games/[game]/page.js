"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { GAME_CATALOG } from "@/lib/premiumCatalog";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const ROUNDS = 3;
const CYCLE_MS = 1400; // one full sweep of the needle, left to right and back

// A moving needle sweeps 0→100→0 on a loop; tapping "Lock" scores how close
// the needle was to the center (100 = dead center). This is a genuine,
// real-time, skill-based mechanic — the same "power meter" pattern used
// for aim/timing in countless real mobile arcade games — used here as the
// working Quick Match mode for games whose own full themed rules are
// still being built (Ludo, Snake & Ladder, Chess, Checkers, Quiz Battle
// and Word Battle already have their own dedicated real engines and live
// at their own routes, so they never render through this page).
export default function QuickDuelPage() {
  const { game } = useParams();
  const meta = GAME_CATALOG.find((x) => x.id === game) || GAME_CATALOG[0];
  const { user, profile, loading } = useAuth();

  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needlePos, setNeedlePos] = useState(0);
  const [locked, setLocked] = useState(false);
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
      setLocked(false);
    }, (err) => setError(err.message || "Match sync error."));
  }, [matchId]);

  // Animate the needle 0→100→0 continuously while it's this player's turn to lock.
  useEffect(() => {
    if (phase !== "playing" || locked) return;
    startRef.current = performance.now();
    function tick(now) {
      const t = ((now - startRef.current) % CYCLE_MS) / CYCLE_MS;
      const pos = t < 0.5 ? t * 2 * 100 : (1 - t) * 2 * 100;
      setNeedlePos(pos);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, locked, match?.round]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: game,
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: { round: 0, scores: { [user.uid]: 0 }, roundLocked: {} },
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

  useEffect(() => {
    if (!match || match.status !== "playing") return;
    if (match.scores?.[match.players?.[1]?.uid] !== undefined) return;
    if (match.hostUid === user.uid) return;
    updateCasualMatch(matchId, { [`scores.${user.uid}`]: 0 }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status]);

  async function lockScore() {
    if (locked || !match) return;
    setLocked(true);
    const distanceFromCenter = Math.abs(50 - needlePos);
    const roundScore = Math.max(0, Math.round(100 - distanceFromCenter * 2)); // 100 = dead center
    const myLocked = { ...(match.roundLocked || {}), [user.uid]: roundScore };
    const bothLocked = match.playerUids.every((uid) => myLocked[uid] !== undefined);

    const patch = { [`roundLocked.${user.uid}`]: roundScore };
    if (bothLocked) {
      const nextRound = match.round + 1;
      const totalMine = (match.scores?.[user.uid] || 0) + roundScore;
      patch[`scores.${user.uid}`] = totalMine;
      const oppUid = match.playerUids.find((u) => u !== user.uid);
      const totalTheirs = (match.scores?.[oppUid] || 0) + (myLocked[oppUid] || 0);
      if (nextRound >= ROUNDS) {
        patch.status = "finished";
        patch.winner = totalMine === totalTheirs ? null : totalMine > totalTheirs ? user.uid : oppUid;
      } else {
        patch.round = nextRound;
        patch.roundLocked = {};
      }
    }
    try { await updateCasualMatch(matchId, patch); }
    catch (e) { setError(e.message || "Score save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">{meta.title}</h1>
            <p className="text-sm text-mist">Quick Duel • {ROUNDS} rounds • live opponent • free</p>
          </div>
        </header>
        <div className="px-4">
          <div className="mb-4 rounded-2xl bg-panel p-4 text-xs text-mist">
            Full {meta.title} rules abhi ban rahe hain — filhaal {meta.title} ka
            live timing-based Quick Duel khel sakte ho, real opponent ke
            saath, real time mein.
          </div>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">{meta.emoji}</div>
          <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
          <button disabled={busy} onClick={cancel} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">
            {busy ? "Cancelling…" : "Cancel"}
          </button>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      </main>
    );
  }

  if (phase === "playing") {
    const opponent = match.players?.find((p) => p.uid !== user.uid);
    const myScore = match.scores?.[user.uid] || 0;
    const theirScore = match.scores?.[opponent?.uid] || 0;

    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">Round {match.round + 1}/{ROUNDS}</p>
          <span className="text-xs text-mist">You {myScore} — {theirScore} {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 mt-6 rounded-2xl bg-panel p-6 text-center ring-1 ring-white/10">
          <p className="text-4xl">{meta.emoji}</p>
          <p className="mt-2 text-xs text-mist">Needle center ke jitna paas rukega, utna zyada score milega</p>
          <div className="relative mt-5 h-4 w-full overflow-hidden rounded-full bg-panel2">
            <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-emerald-400/60" />
            <div
              className="absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full bg-yellow-300 shadow-glow"
              style={{ left: `${needlePos}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>
          <button
            disabled={locked}
            onClick={lockScore}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black disabled:opacity-60"
          >
            {locked ? "Waiting for opponent…" : "🎯 Lock"}
          </button>
        </div>
        {error && <p className="mx-4 mt-3 text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  if (phase === "finished") {
    const opponent = match.players?.find((p) => p.uid !== user.uid);
    const myScore = match.scores?.[user.uid] || 0;
    const theirScore = match.scores?.[opponent?.uid] || 0;
    const won = match.winner === user.uid;
    const draw = !match.winner;

    return (
      <main className="min-h-screen bg-void text-ink flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
          <p className="text-6xl">{draw ? "🤝" : won ? "🏆" : "😔"}</p>
          <h1 className="mt-4 font-display text-2xl font-bold">{draw ? "Draw" : won ? "You Won!" : "You Lost"}</h1>
          <p className="mt-2 text-sm text-mist">You {myScore} — {theirScore} {opponent?.name || ""}</p>
          <button
            onClick={() => { setMatchId(null); setMatch(null); setPhase("setup"); }}
            className="mt-6 block w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black"
          >
            Play Again
          </button>
        </div>
      </main>
    );
  }

  return null;
}
