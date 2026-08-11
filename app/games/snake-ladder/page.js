"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { rollDice, applyRoll, boardLayout, LADDERS, SNAKES } from "@/lib/snakeLadderEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const TOKEN_COLOR = { a: "text-teal-300", b: "text-pink-400" };

export default function SnakeLadderPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);

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

  const rows = useMemo(() => boardLayout(), []);
  const positions = match?.positions || {};

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  const mySlot = match?.players?.findIndex((p) => p.uid === user.uid) === 0 ? "a" : "b";
  const myTurn = phase === "playing" && match?.turnUid === user.uid;

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: "snake-ladder",
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: { positions: { [user.uid]: 0 }, lastRoll: null, lastJump: null },
      });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "snake-ladder"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  // Seed the second player's position + assign the opening turn to the host once both joined.
  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const positions = { ...(match.positions || {}) };
    for (const p of match.players) if (positions[p.uid] == null) positions[p.uid] = 0;
    updateCasualMatch(matchId, { positions, turnUid: match.hostUid, setupDone: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  async function onRoll() {
    if (!myTurn || rolling) return;
    setRolling(true);
    const roll = rollDice();
    // Small delay so the dice face has time to feel like it's actually rolling.
    await new Promise((r) => setTimeout(r, 550));
    try {
      const myPos = positions[user.uid] || 0;
      const result = applyRoll(myPos, roll);
      const opponent = match.players.find((p) => p.uid !== user.uid);
      const patch = {
        positions: { ...positions, [user.uid]: result.pos },
        lastRoll: roll,
        lastJump: result.jumped,
        turnUid: result.extraTurn ? user.uid : opponent.uid,
      };
      if (result.won) { patch.status = "finished"; patch.winner = user.uid; }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Roll save nahi hua."); }
    finally { setRolling(false); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🐍 Snake & Ladder</h1>
            <p className="text-sm text-mist">1v1 real-time • roll a 6 for an extra turn, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🐍</div>
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
    const oppSlot = mySlot === "a" ? "b" : "a";
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">
            {phase === "finished" ? (match.winner === user.uid ? "You won! 🏆" : "You lost") : myTurn ? "Your turn" : "Opponent's turn"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex items-center justify-between rounded-xl bg-panel px-4 py-2 text-xs ring-1 ring-white/10">
          <span className={TOKEN_COLOR[mySlot]}>● You — square {positions[user.uid] || 0}</span>
          <span className={TOKEN_COLOR[oppSlot]}>● {opponent?.name} — square {positions[opponent?.uid] || 0}</span>
        </div>

        <div className="mx-4 mt-3 grid grid-cols-10 overflow-hidden rounded-2xl ring-1 ring-white/10">
          {rows.map((row, ri) =>
            row.map((n) => {
              const hasLadder = LADDERS[n];
              const hasSnake = SNAKES[n];
              const occupants = match.players.filter((p) => (positions[p.uid] || 0) === n && n !== 0);
              const shade = ri % 2 === (row.indexOf(n) % 2) ? "bg-panel2" : "bg-panel";
              return (
                <div key={n} className={`relative flex aspect-square flex-col items-center justify-center text-[9px] ${shade} ${hasLadder ? "bg-emerald-500/10" : ""} ${hasSnake ? "bg-red-500/10" : ""}`}>
                  <span className="absolute left-0.5 top-0.5 text-mist/60">{n}</span>
                  {hasLadder && <span className="text-[11px]">🪜</span>}
                  {hasSnake && <span className="text-[11px]">🐍</span>}
                  <div className="flex gap-0.5">
                    {occupants.map((p) => (
                      <span key={p.uid} className={`text-sm ${TOKEN_COLOR[p.uid === user.uid ? mySlot : oppSlot]}`}>●</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {phase === "playing" && (
          <div className="mx-4 mt-5 flex flex-col items-center gap-3">
            {match.lastRoll != null && (
              <p className="text-xs text-mist">
                Last roll: 🎲 {match.lastRoll}{match.lastJump === "ladder" ? " — climbed a ladder! 🪜" : match.lastJump === "snake" ? " — bitten by a snake! 🐍" : ""}
              </p>
            )}
            <button
              disabled={!myTurn || rolling}
              onClick={onRoll}
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 to-yellow-300 text-4xl font-black text-black disabled:opacity-40"
            >
              {rolling ? "🎲" : myTurn ? "Roll" : "…"}
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-5">
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
