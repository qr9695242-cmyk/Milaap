"use client";

import { useEffect, useRef, useState } from "react";
import {
  LUDO_BET_AMOUNTS,
  getUserLudoBalance,
  initializeUserLudoWallet,
  findOrCreateLudoMatch,
  listenToMatch,
  markPlayerReady,
  rollDice,
  makeMove,
  endMatch,
  cancelMatch,
} from "@/lib/ludo";

const TOKENS_PER_PLAYER = 4;
const HOME_STRETCH_START = 52;
const FINISHED = 58;

function tokenLabel(step) {
  if (step === 0) return "Base";
  if (step >= FINISHED) return "Home 🏁";
  if (step >= HOME_STRETCH_START) return `Stretch ${step - HOME_STRETCH_START + 1}`;
  return `Cell ${step}`;
}

/**
 * Full-screen modal Ludo game.
 * Props: uid, name, avatar, onClose()
 */
export default function LudoGame({ uid, name, avatar, onClose }) {
  const [wallet, setWallet] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endingRef = useRef(false);

  // Load / create the ludo wallet on open
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initializeUserLudoWallet(uid);
      const bal = await getUserLudoBalance(uid);
      if (!cancelled) setWallet(bal);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Subscribe to the active match once one exists
  useEffect(() => {
    if (!matchId) return;
    const unsub = listenToMatch(matchId, setMatch);
    return () => unsub();
  }, [matchId]);

  // Refresh the wallet balance whenever the match finishes
  useEffect(() => {
    if (match?.status === "completed") {
      getUserLudoBalance(uid).then(setWallet);
    }
  }, [match?.status, uid]);

  // If the game state reports a winner, the *winning player's own client*
  // settles the match (firestore.rules only lets a user credit their own
  // ludoWallet, so the loser's client must not attempt this write).
  useEffect(() => {
    if (!match || !matchId) return;
    const winnerIndex = match.gameState?.winner;
    if (winnerIndex === null || winnerIndex === undefined) return;
    if (match.settled || match.status === "completed") return;
    if (endingRef.current) return;
    const winnerUid = match.players?.[winnerIndex]?.userId;
    if (winnerUid !== uid) return; // not my win to settle
    endingRef.current = true;
    endMatch(matchId, winnerUid).catch((e) => console.error("endMatch failed:", e));
  }, [match, matchId, uid]);

  async function handlePickBet(amount) {
    setError("");
    setBusy(true);
    try {
      const { matchId: id } = await findOrCreateLudoMatch(uid, name, avatar || "", amount);
      setMatchId(id);
    } catch (e) {
      setError(e.message || "Match nahi ban saka.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!matchId) return;
    setBusy(true);
    try {
      await cancelMatch(matchId, uid);
      setMatchId(null);
      setMatch(null);
      getUserLudoBalance(uid).then(setWallet);
    } catch (e) {
      setError(e.message || "Cancel nahi ho saka.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReady() {
    if (!matchId) return;
    setBusy(true);
    try {
      await markPlayerReady(matchId, uid);
    } finally {
      setBusy(false);
    }
  }

  async function handleRoll() {
    if (!matchId) return;
    setBusy(true);
    try {
      await rollDice(matchId, uid);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(tokenIndex) {
    if (!matchId) return;
    setBusy(true);
    try {
      await makeMove(matchId, uid, tokenIndex);
    } finally {
      setBusy(false);
    }
  }

  const myPlayerIndex = match?.players?.findIndex((p) => p.userId === uid);
  const isMyTurn = match?.gameState && myPlayerIndex === match.gameState.turn;
  const myTokens = match?.gameState?.tokens?.[myPlayerIndex] || [];
  // A token can move once dice is rolled: from base only on a 6, otherwise
  // any token already on the board that wouldn't overshoot FINISHED.
  const dice = match?.gameState?.dice;
  const movableTokens =
    dice != null
      ? myTokens
          .map((s, i) => ({ i, s }))
          .filter(({ s }) => (s === 0 ? dice === 6 : s < FINISHED))
          .map(({ i }) => i)
      : [];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-void">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h2 className="font-display text-sm font-bold text-ink">🎲 Ludo</h2>
        <button onClick={onClose} className="text-xs text-mist">✕ Close</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <p className="mb-3 rounded-lg bg-neon-pink/10 p-2 text-xs text-neon-pink">{error}</p>
        )}

        <p className="mb-4 text-xs text-mist">
          Ludo wallet: <span className="font-bold text-gold">{(wallet?.coins ?? 0).toLocaleString()} coins</span>
        </p>

        {!matchId && (
          <>
            <p className="mb-2 text-xs text-mist">Bet select karein — dono players barabar bet lagate hain, jeetne wale ko poora pool milta hai.</p>
            <div className="grid grid-cols-2 gap-2">
              {LUDO_BET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  disabled={busy || (wallet && wallet.coins < amt)}
                  onClick={() => handlePickBet(amt)}
                  className="rounded-xl bg-panel px-3 py-3 text-sm font-semibold text-ink ring-1 ring-white/10 disabled:opacity-40"
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </>
        )}

        {matchId && match?.status === "waiting" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-ink">Opponent dhoonda ja raha hai…</p>
            <p className="text-xs text-mist">Bet: {match.betAmount?.toLocaleString()} coins</p>
            <button onClick={handleCancel} disabled={busy} className="rounded-full bg-white/10 px-4 py-2 text-xs text-ink disabled:opacity-50">
              Cancel
            </button>
          </div>
        )}

        {matchId && (match?.status === "starting" || match?.status === "playing") && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              {match.players.map((p) => (
                <div key={p.userId} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: p.color === "red" ? "#ef4444" : p.color === "blue" ? "#3b82f6" : p.color === "yellow" ? "#eab308" : "#22c55e" }}
                  />
                  <span className={`text-xs ${p.userId === uid ? "font-bold text-ink" : "text-mist"}`}>{p.userName}</span>
                  {p.ready && match.status === "starting" && <span className="text-[10px] text-emerald-400">Ready</span>}
                </div>
              ))}
            </div>

            {match.status === "starting" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-ink">Match mil gaya! Ready dabayein.</p>
                <button
                  onClick={handleReady}
                  disabled={busy || match.players.find((p) => p.userId === uid)?.ready}
                  className="rounded-full bg-glow-gradient px-5 py-2 text-sm font-bold text-ink disabled:opacity-50"
                >
                  {match.players.find((p) => p.userId === uid)?.ready ? "Waiting for opponent…" : "Ready"}
                </button>
              </div>
            )}

            {match.status === "playing" && (
              <>
                <p className="mb-3 text-center text-sm text-ink">
                  {isMyTurn ? "Aapki baari hai" : `${match.players[match.gameState.turn]?.userName}'s turn`}
                </p>

                <div className="mb-4 flex flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-panel text-3xl font-bold text-ink ring-1 ring-white/10">
                    {dice ?? "–"}
                  </div>
                  <button
                    onClick={handleRoll}
                    disabled={busy || !isMyTurn || dice != null}
                    className="rounded-full bg-glow-gradient px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
                  >
                    Roll Dice
                  </button>
                </div>

                <div className="space-y-3">
                  {match.players.map((p, pi) => (
                    <div key={p.userId} className="rounded-xl bg-panel p-3 ring-1 ring-white/5">
                      <p className="mb-2 text-xs font-semibold text-ink">{p.userName} ({p.color})</p>
                      <div className="grid grid-cols-4 gap-2">
                        {(match.gameState.tokens?.[pi] || []).map((step, ti) => {
                          const canMove = pi === myPlayerIndex && isMyTurn && movableTokens.includes(ti);
                          return (
                            <button
                              key={ti}
                              disabled={!canMove || busy}
                              onClick={() => handleMove(ti)}
                              className={`rounded-lg px-2 py-2 text-[10px] font-semibold ring-1 ${
                                canMove ? "bg-glow-gradient text-ink ring-transparent" : "bg-panel2 text-mist ring-white/5"
                              }`}
                            >
                              {tokenLabel(step)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {matchId && match?.status === "completed" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-lg font-bold text-gold">
              {match.winnerId === uid ? "🎉 Aap jeet gaye!" : `${match.players.find((p) => p.userId === match.winnerId)?.userName || "Opponent"} jeet gaya`}
            </p>
            <p className="text-sm text-ink">Prize: {match.prizePool?.toLocaleString()} coins</p>
            <button
              onClick={() => {
                setMatchId(null);
                setMatch(null);
                endingRef.current = false;
              }}
              className="rounded-full bg-glow-gradient px-5 py-2 text-sm font-bold text-ink"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
