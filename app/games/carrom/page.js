"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { simulateShot, isSettled, stepPhysics } from "@/lib/poolPhysics";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const TABLE = { w: 100, h: 100, pocketRadius: 3.6, pockets: [
  { x: 2, y: 2 }, { x: 98, y: 2 }, { x: 2, y: 98 }, { x: 98, y: 98 },
] };
const R = 2.4;
const COIN_COLOR = { white: "#f5f5f0", black: "#1c1c1c", queen: "#ef4444", striker: "#fbbf24" };

function rackedCoins() {
  const coins = [{ id: "striker", color: "striker", x: 50, y: 78, vx: 0, vy: 0, r: R * 1.1, potted: false }];
  coins.push({ id: "queen", color: "queen", x: 50, y: 50, vx: 0, vy: 0, r: R, potted: false });
  // Ring of 8 coins (4 white, 4 black alternating) around the queen — a simplified real carrom rack.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    coins.push({
      id: `c${i}`, color: i % 2 === 0 ? "white" : "black",
      x: 50 + Math.cos(a) * R * 2.3, y: 50 + Math.sin(a) * R * 2.3,
      vx: 0, vy: 0, r: R, potted: false,
    });
  }
  return coins;
}

export default function CarromPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [angle, setAngle] = useState(270);
  const [power, setPower] = useState(50);
  const [displayCoins, setDisplayCoins] = useState(null);
  const [animating, setAnimating] = useState(false);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

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

  const coins = displayCoins || match?.coins || [];
  const opponent = match?.players?.find((p) => p.uid !== user?.uid);
  const myColor = match?.colors?.[user?.uid];
  const oppColor = myColor === "white" ? "black" : "white";
  const myTurn = phase === "playing" && match?.turnUid === user?.uid && !animating;
  const potted = match?.potted || {};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || coins.length === 0) return;
    const ctx = canvas.getContext("2d");
    const scale = canvas.width / TABLE.w;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d4a574";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    ctx.fillStyle = "#000";
    for (const p of TABLE.pockets) {
      ctx.beginPath(); ctx.arc(p.x * scale, p.y * scale, TABLE.pocketRadius * scale, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of coins) {
      if (c.potted) continue;
      ctx.beginPath();
      ctx.arc(c.x * scale, c.y * scale, c.r * scale, 0, Math.PI * 2);
      ctx.fillStyle = COIN_COLOR[c.color];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.stroke();
    }
    if (myTurn && !animating) {
      const striker = coins.find((c) => c.id === "striker" && !c.potted);
      if (striker) {
        const rad = (angle * Math.PI) / 180;
        ctx.strokeStyle = "rgba(255,255,255,.6)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(striker.x * scale, striker.y * scale);
        ctx.lineTo((striker.x + Math.cos(rad) * 18) * scale, (striker.y + Math.sin(rad) * 18) * scale);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [coins, angle, myTurn, animating]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "carrom", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "carrom"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, {
      coins: rackedCoins(), turnUid: p1.uid, setupDone: true,
      colors: { [p1.uid]: "white", [p2.uid]: "black" },
      potted: { [p1.uid]: [], [p2.uid]: [] },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  function shoot() {
    if (!myTurn) return;
    const striker = coins.find((c) => c.id === "striker" && !c.potted);
    if (!striker) return;
    const rad = (angle * Math.PI) / 180;
    const speed = (power / 100) * 3.2;
    const shotCoins = coins.map((c) => (c.id === "striker" ? { ...c, vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed } : { ...c }));

    setAnimating(true);
    let frame = shotCoins;
    function animate() {
      frame = stepPhysics(frame, TABLE);
      setDisplayCoins(frame.map((c) => ({ ...c })));
      if (!isSettled(frame)) { rafRef.current = requestAnimationFrame(animate); return; }
      finishShot(shotCoins);
    }
    rafRef.current = requestAnimationFrame(animate);
  }

  async function finishShot(shotCoins) {
    const { balls: finalCoins, newlyPotted } = simulateShot(shotCoins, TABLE);
    setAnimating(false);
    setDisplayCoins(null);

    const strikerPotted = newlyPotted.includes("striker");
    const queenPotted = newlyPotted.includes("queen");
    const myPottedIds = newlyPotted.filter((id) => {
      const coin = shotCoins.find((c) => c.id === id);
      return coin && coin.color === myColor;
    });
    const myTotal = [...(potted[user.uid] || []), ...myPottedIds];
    if (queenPotted) myTotal.push("queen");
    const won = myTotal.filter((id) => id !== "queen").length >= 4; // 4 of your own color coins

    let restored = finalCoins;
    if (strikerPotted) {
      restored = finalCoins.map((c) => (c.id === "striker" ? { ...c, potted: false, x: 50, y: myColor === "white" ? 78 : 22, vx: 0, vy: 0 } : c));
    }

    const patch = { coins: restored, potted: { ...potted, [user.uid]: myTotal } };
    if (won) { patch.status = "finished"; patch.winner = user.uid; }
    else if (strikerPotted || (myPottedIds.length === 0 && !queenPotted)) patch.turnUid = opponent.uid;
    else patch.turnUid = user.uid;

    try { await updateCasualMatch(matchId, patch); }
    catch (e) { setError(e.message || "Shot save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🎯 Carrom</h1>
            <p className="text-sm text-mist">1v1 real-time • real physics board, free</p>
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
            {phase === "finished" ? (match.winner === user.uid ? "You won! 🏆" : "You lost") : myTurn ? "Your shot" : "Opponent's shot"}
          </p>
          <span className="text-xs text-mist">vs {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 flex justify-between text-xs text-mist">
          <span>You ({myColor}): {(potted[user.uid] || []).filter((i) => i !== "queen").length}/4</span>
          <span>{opponent?.name} ({oppColor}): {(potted[opponent?.uid] || []).filter((i) => i !== "queen").length}/4</span>
        </div>

        <div className="mx-4 mt-2 overflow-hidden rounded-xl ring-1 ring-white/10">
          <canvas ref={canvasRef} width={320} height={320} className="w-full" />
        </div>

        {phase === "playing" && (
          <div className="mx-5 mt-5 space-y-4">
            <div>
              <p className="mb-1 text-[10px] text-mist">Angle: {angle}°</p>
              <input type="range" min="0" max="360" value={angle} disabled={!myTurn}
                onChange={(e) => setAngle(Number(e.target.value))} className="w-full accent-teal-400" />
            </div>
            <div>
              <p className="mb-1 text-[10px] text-mist">Power: {power}%</p>
              <input type="range" min="10" max="100" value={power} disabled={!myTurn}
                onChange={(e) => setPower(Number(e.target.value))} className="w-full accent-teal-400" />
            </div>
            <button
              disabled={!myTurn}
              onClick={shoot}
              className="w-full rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-40"
            >
              {myTurn ? "🎯 Strike" : animating ? "Coins moving…" : "Opponent's turn…"}
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-6">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setDisplayCoins(null); setPhase("setup"); }}
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
