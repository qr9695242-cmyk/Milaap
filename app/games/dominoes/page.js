"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { dealGame, findStarter, tileMatches, canPlayAny, playTile, pipTotal, tileKey } from "@/lib/dominoesEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

function Tile({ t, onClick, small }) {
  return (
    <button
      onClick={onClick}
      className={`flex ${small ? "h-12 w-7" : "h-16 w-9"} flex-col items-center justify-center rounded-md bg-ink text-void ring-1 ring-black/20`}
    >
      <span className={small ? "text-[10px] font-bold" : "text-xs font-bold"}>{t.a}</span>
      <span className="h-px w-4 bg-black/30" />
      <span className={small ? "text-[10px] font-bold" : "text-xs font-bold"}>{t.b}</span>
    </button>
  );
}

export default function DominoesPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

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

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  const hands = match?.hands || {};
  const myHand = hands[user.uid] || [];
  const opponent = match?.players?.find((p) => p.uid !== user.uid);
  const oppHand = opponent ? hands[opponent.uid] || [] : [];
  const chain = match?.chain || [];
  const leftEnd = match?.leftEnd ?? null;
  const rightEnd = match?.rightEnd ?? null;
  const myTurn = phase === "playing" && match?.turnUid === user.uid;
  const boneyard = match?.boneyard || [];
  const iCanPlay = myTurn && canPlayAny(myHand, leftEnd, rightEnd);
  const iMustDraw = myTurn && !iCanPlay && boneyard.length > 0;
  const iMustPass = myTurn && !iCanPlay && boneyard.length === 0;

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: "dominoes",
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: {},
      });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "dominoes"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  // Host deals the game once both players have joined.
  useEffect(() => {
    if (!match || match.status !== "playing" || match.dealt) return;
    if (match.hostUid !== user.uid) return;
    const { handA, handB, boneyard } = dealGame();
    const [p1, p2] = match.players;
    const starterSlot = findStarter(handA, handB);
    updateCasualMatch(matchId, {
      dealt: true,
      hands: { [p1.uid]: handA, [p2.uid]: handB },
      boneyard,
      chain: [],
      leftEnd: null,
      rightEnd: null,
      turnUid: starterSlot === "a" ? p1.uid : p2.uid,
      passStreak: 0,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.dealt]);

  function finishTurn(patch, myNewHand) {
    const opponentEmpty = myNewHand.length === 0;
    const final = { ...patch, hands: { ...hands, [user.uid]: myNewHand } };
    if (opponentEmpty) {
      final.status = "finished";
      final.winner = user.uid;
    } else {
      final.turnUid = opponent.uid;
      final.passStreak = 0;
    }
    return final;
  }

  async function onPlay(tile, side) {
    if (!myTurn || !tileMatches(tile, side === "left" ? leftEnd : rightEnd) && leftEnd != null) return;
    try {
      const { leftEnd: nl, rightEnd: nr } = playTile(tile, side, leftEnd, rightEnd);
      const newHand = myHand.filter((t) => tileKey(t) !== tileKey(tile));
      const newChain = side === "right" || leftEnd == null ? [...chain, tile] : [tile, ...chain];
      const patch = finishTurn({ chain: newChain, leftEnd: nl, rightEnd: nr }, newHand);
      await updateCasualMatch(matchId, patch);
      setSelected(null);
    } catch (e) { setError(e.message || "Move save nahi hua."); }
  }

  async function onDraw() {
    if (!iMustDraw) return;
    try {
      const [drawn, ...restBoneyard] = boneyard;
      const newHand = [...myHand, drawn];
      const nowCanPlay = canPlayAny(newHand, leftEnd, rightEnd);
      const patch = { hands: { ...hands, [user.uid]: newHand }, boneyard: restBoneyard };
      if (!nowCanPlay && restBoneyard.length === 0) {
        patch.turnUid = opponent.uid; // stuck — pass after emptying the boneyard
        patch.passStreak = (match.passStreak || 0) + 1;
      }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Draw failed."); }
  }

  async function onPass() {
    if (!iMustPass) return;
    try {
      const newStreak = (match.passStreak || 0) + 1;
      const patch = { turnUid: opponent.uid, passStreak: newStreak };
      // Both players stuck with an empty boneyard — game is blocked, lowest pip total wins.
      if (newStreak >= 2) {
        const myPips = pipTotal(myHand);
        const oppPips = pipTotal(oppHand);
        patch.status = "finished";
        patch.winner = myPips === oppPips ? null : myPips < oppPips ? user.uid : opponent.uid;
      }
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Pass failed."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🀄 Dominoes</h1>
            <p className="text-sm text-mist">1v1 real-time • double-six set, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🀄</div>
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
              : myTurn ? "Your move" : "Opponent's move"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex items-center justify-between text-xs text-mist">
          <span>{opponent?.name}: {oppHand.length} tiles</span>
          <span>Boneyard: {boneyard.length}</span>
        </div>

        <div className="mx-4 mt-3 min-h-[80px] overflow-x-auto rounded-2xl bg-panel p-3 ring-1 ring-white/10">
          {chain.length === 0 ? (
            <p className="flex h-16 items-center justify-center text-xs text-mist">Chain is empty — play any tile to open</p>
          ) : (
            <div className="flex w-max gap-1">
              {chain.map((t, i) => <Tile key={i} t={t} small />)}
            </div>
          )}
        </div>
        {chain.length > 0 && (
          <p className="mx-4 mt-1 text-center text-[10px] text-mist">open ends: {leftEnd} ⟷ {rightEnd}</p>
        )}

        {phase === "playing" && (
          <>
            <div className="mx-4 mt-6 flex flex-wrap justify-center gap-2">
              {myHand.map((t) => {
                const playableLeft = leftEnd == null || tileMatches(t, leftEnd);
                const playableRight = leftEnd != null && tileMatches(t, rightEnd);
                const playable = myTurn && (playableLeft || playableRight);
                const isSel = selected && tileKey(selected) === tileKey(t);
                return (
                  <div key={tileKey(t)} className="flex flex-col items-center gap-1">
                    <div className={`rounded-lg ${playable ? "ring-2 ring-emerald-400" : "opacity-60"} ${isSel ? "ring-teal-300" : ""}`}>
                      <Tile t={t} onClick={() => playable && setSelected(isSel ? null : t)} />
                    </div>
                    {isSel && (
                      <div className="flex gap-1">
                        {playableLeft && <button onClick={() => onPlay(t, "left")} className="rounded bg-emerald-400 px-2 py-0.5 text-[9px] font-bold text-black">◀ Left</button>}
                        {playableRight && <button onClick={() => onPlay(t, "right")} className="rounded bg-emerald-400 px-2 py-0.5 text-[9px] font-bold text-black">Right ▶</button>}
                        {leftEnd == null && <button onClick={() => onPlay(t, "right")} className="rounded bg-emerald-400 px-2 py-0.5 text-[9px] font-bold text-black">Play</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mx-4 mt-5 flex justify-center gap-3">
              {iMustDraw && (
                <button onClick={onDraw} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold">
                  Draw from boneyard ({boneyard.length})
                </button>
              )}
              {iMustPass && (
                <button onClick={onPass} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold">Pass</button>
              )}
            </div>
          </>
        )}

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
