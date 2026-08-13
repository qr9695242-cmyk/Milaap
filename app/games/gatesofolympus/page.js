"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// GatesOfOlympus — virtual-coin click-to-clear match game. No real-money wagering.

const SYMBOLS = ["⚡", "👑", "🍇", "🦅", "🏛️", "💰"];
const COLS = 6;
const ROWS = 7;

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function freshBoard() {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => randomSymbol()));
}

function findGroup(board, col, row) {
  const target = board[col][row];
  if (!target) return [];
  const seen = new Set();
  const stack = [[col, row]];
  const group = [];
  while (stack.length) {
    const [c, r] = stack.pop();
    const key = `${c}-${r}`;
    if (seen.has(key)) continue;
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
    if (board[c][r] !== target) continue;
    seen.add(key);
    group.push([c, r]);
    stack.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]);
  }
  return group;
}

function clearAndTumble(board, group) {
  const next = board.map((col) => [...col]);
  group.forEach(([c, r]) => { next[c][r] = null; });
  // Gravity per column: compact remaining symbols to the bottom, fill top with new ones.
  for (let c = 0; c < COLS; c++) {
    const remaining = next[c].filter((v) => v !== null);
    const missing = ROWS - remaining.length;
    next[c] = [...Array.from({ length: missing }, randomSymbol), ...remaining];
  }
  return next;
}

export default function GatesOfOlympusPage() {
  const { user, profile, loading } = useAuth();
  const [stake, setStake] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [board, setBoard] = useState(freshBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("Tap a group of 3+ matching symbols to clear them");

  if (loading || !user) {
    return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function tapTile(col, row) {
    if (walletBusy) return;
    const group = findGroup(board, col, row);
    if (group.length < 3) {
      setMessage("Need 3+ connected matching symbols — try another spot");
      return;
    }
    const points = group.length * 10 + Math.max(0, group.length - 3) * 5;
    setWalletBusy(true);
    let sid;
    try { sid = await beginGameSession({ uid: user.uid, gameId: "gates", entryCoins: stake }); }
    catch (e) { alert(e.message || "Unable to start game"); return; }
    finally { setWalletBusy(false); }
    setBoard(clearAndTumble(board, group));
    setScore((s) => {
      const next = s + points;
      setBest((b) => Math.max(b, next));
      return next;
    });
    setMessage(`💥 Cleared ${group.length} symbols! +${points}`);
    settleGameSession({ sessionId: sid, uid: user.uid, gameId: "gates", score: points, rewardCoins: scoreToReward(points, { entryCoins: stake, multiplier: 1 }), outcome: "move" }).catch(() => {});
  }

  function resetBoard() {
    setBoard(freshBoard());
    setScore(0);
    setMessage("Tap a group of 3+ matching symbols to clear them");
  }

  return (
    <main className="game-screen min-h-screen bg-void text-ink pb-10">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/games" className="text-2xl text-mist">‹</Link>
        <div>
          <h1 className="font-display text-xl font-bold">⚡ GatesOfOlympus</h1>
          <p className="text-sm text-mist">Free play match game • virtual coins</p>
        </div>
      </header>

      <section className="mx-4 rounded-3xl bg-panel p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-mist">No real money</span>
        </div>

        <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />

        <p className="mt-3 text-center text-xs text-mist">{message}</p>

        <div className="mt-3 grid grid-cols-6 gap-1.5">
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: COLS }).map((_, col) => (
              <button
                key={`${col}-${row}`}
                onClick={() => tapTile(col, row)}
                className="flex aspect-square items-center justify-center rounded-lg bg-panel2 text-xl ring-1 ring-white/10 active:scale-95"
              >
                {board[col][row]}
              </button>
            ))
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-mist">Score</p>
            <p className="text-sm font-bold text-ink">{score}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-2">
            <p className="text-[10px] text-mist">Best</p>
            <p className="text-sm font-bold text-ink">{best}</p>
          </div>
        </div>

        <button onClick={resetBoard} className="mt-4 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">
          🔄 New Board
        </button>

        <p className="mt-4 text-center text-[10px] leading-4 text-mist/70">
          GatesOfOlympus is an entertainment-only mini-game. It does not use real money, does not
          debit or credit your wallet, and cannot be cashed out.
        </p>
      </section>
    </main>
  );
}
