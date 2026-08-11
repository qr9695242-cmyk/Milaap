"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { dealGame, canPlay, drawCards, cardLabel, COLORS } from "@/lib/unoEngine";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const COLOR_BG = { red: "bg-red-500", yellow: "bg-yellow-400", green: "bg-emerald-500", blue: "bg-blue-500", wild: "bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500" };
const COLOR_TEXT = { red: "text-red-400", yellow: "text-yellow-300", green: "text-emerald-400", blue: "text-blue-400" };

function Card({ card, onClick, dim }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-16 w-11 flex-col items-center justify-center rounded-lg text-white ring-1 ring-black/30 ${COLOR_BG[card.color]} ${dim ? "opacity-50" : ""}`}
    >
      <span className="text-xs font-black drop-shadow">{cardLabel(card)}</span>
    </button>
  );
}

export default function UnoPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingWild, setPendingWild] = useState(null); // card awaiting color choice

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
  const discard = match?.discard || [];
  const topCard = discard[discard.length - 1];
  const currentColor = match?.currentColor;
  const drawPile = match?.drawPile || [];
  const myTurn = phase === "playing" && match?.turnUid === user.uid;

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "uno", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "uno"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.dealt) return;
    if (match.hostUid !== user.uid) return;
    const { handA, handB, drawPile, discard, currentColor } = dealGame();
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, {
      dealt: true, hands: { [p1.uid]: handA, [p2.uid]: handB }, drawPile, discard, currentColor, turnUid: p1.uid,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.dealt]);

  async function playCard(card, chosenColor) {
    if (!myTurn || !opponent) return;
    if (!canPlay(card, topCard, currentColor)) return;
    if (card.color === "wild" && !chosenColor) { setPendingWild(card); return; }
    try {
      const newHand = myHand.filter((c) => c !== card);
      const newDiscard = [...discard, card];
      let patch = { hands: { ...hands, [user.uid]: newHand }, discard: newDiscard, currentColor: chosenColor || card.color };

      if (newHand.length === 0) {
        patch.status = "finished";
        patch.winner = user.uid;
      } else if (card.value === "draw2" || card.value === "wild4") {
        const { drawn, drawPile: np, discard: nd } = drawCards(drawPile, newDiscard, card.value === "draw2" ? 2 : 4);
        patch.hands[opponent.uid] = [...oppHand, ...drawn];
        patch.drawPile = np;
        patch.discard = nd;
        patch.turnUid = user.uid; // opponent skipped after drawing
      } else if (card.value === "skip" || card.value === "reverse") {
        patch.turnUid = user.uid; // opponent skipped — 2-player table
      } else {
        patch.turnUid = opponent.uid;
      }
      await updateCasualMatch(matchId, patch);
      setPendingWild(null);
    } catch (e) { setError(e.message || "Move save nahi hua."); }
  }

  async function onDraw() {
    if (!myTurn) return;
    try {
      const { drawn, drawPile: np, discard: nd } = drawCards(drawPile, discard, 1);
      const patch = { hands: { ...hands, [user.uid]: [...myHand, ...drawn] }, drawPile: np, discard: nd, turnUid: opponent.uid };
      await updateCasualMatch(matchId, patch);
    } catch (e) { setError(e.message || "Draw failed."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🃏 UNO</h1>
            <p className="text-sm text-mist">1v1 real-time • full 108-card deck, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🃏</div>
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
            {phase === "finished" ? (match.winner === user.uid ? "You won! 🏆" : "You lost") : myTurn ? "Your move" : "Opponent's move"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex items-center justify-between text-xs text-mist">
          <span>{opponent?.name}: {oppHand.length} cards</span>
          <span>Draw pile: {drawPile.length}</span>
        </div>

        <div className="mx-4 mt-4 flex items-center justify-center gap-4">
          {topCard && <Card card={topCard} />}
          <div className="text-center">
            <p className="text-[10px] text-mist">current color</p>
            <p className={`font-display text-lg font-black capitalize ${COLOR_TEXT[currentColor] || ""}`}>{currentColor}</p>
          </div>
        </div>

        {pendingWild && (
          <div className="mx-4 mt-4 rounded-xl bg-panel p-3 ring-1 ring-white/10">
            <p className="mb-2 text-center text-xs text-mist">Choose a color for your wild card</p>
            <div className="flex justify-center gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => playCard(pendingWild, c)} className={`h-9 w-9 rounded-full ${COLOR_BG[c]} ring-1 ring-black/30`} />
              ))}
            </div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div className="mx-4 mt-6 flex flex-wrap justify-center gap-2">
              {myHand.map((c, i) => {
                const playable = myTurn && canPlay(c, topCard, currentColor);
                return <Card key={i} card={c} dim={!playable} onClick={() => playable && playCard(c)} />;
              })}
            </div>
            <div className="mx-4 mt-5 flex justify-center">
              <button onClick={onDraw} disabled={!myTurn} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold disabled:opacity-40">
                Draw a card
              </button>
            </div>
          </>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-5">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setPendingWild(null); setPhase("setup"); }}
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
