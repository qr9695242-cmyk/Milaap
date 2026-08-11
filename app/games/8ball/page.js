"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { simulateShot, isSettled, stepPhysics } from "@/lib/poolPhysics";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const TABLE = { w: 100, h: 50, pocketRadius: 3.4, pockets: [
  { x: 0, y: 0 }, { x: 50, y: -0.5 }, { x: 100, y: 0 },
  { x: 0, y: 50 }, { x: 50, y: 50.5 }, { x: 100, y: 50 },
] };
const R = 2.1;
const BALL_COLORS = { cue: "#f5f5f0", 1: "#facc15", 2: "#3b82f6", 3: "#ef4444", 4: "#a855f7", 5: "#f97316", 6: "#22c55e", 7: "#7c2d12", 8: "#111111" };

function rackedBalls() {
  const balls = [{ id: "cue", x: 25, y: 25, vx: 0, vy: 0, r: R, potted: false }];
  const rows = [[8], [1, 2], [3, 4, 5], [6, 7]]; // 8-ball buried in the front, like a real rack
  let num = 0;
  const startX = 72;
  for (let row = 0; row < rows.length; row++) {
    const count = rows[row].length;
    const x = startX + row * (R * 1.9);
    for (let k = 0; k < count; k++) {
      const y = 25 - (count - 1) * R + k * R * 2;
      balls.push({ id: rows[row][k], x, y, vx: 0, vy: 0, r: R, potted: false });
    }
  }
  return balls;
}

export default function EightBallPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [angle, setAngle] = useState(180);
  const [power, setPower] = useState(50);
  const [displayBalls, setDisplayBalls] = useState(null);
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

  const balls = displayBalls || match?.balls || [];
  const opponent = match?.players?.find((p) => p.uid !== user?.uid);
  const myTurn = phase === "playing" && match?.turnUid === user?.uid && !animating;
  const potted = match?.potted || {};

  // Draw the table + balls whenever state changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || balls.length === 0) return;
    const ctx = canvas.getContext("2d");
    const scaleX = canvas.width / TABLE.w, scaleY = canvas.height / TABLE.h;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0d5c3f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (const p of TABLE.pockets) {
      ctx.beginPath();
      ctx.arc(p.x * scaleX, p.y * scaleY, TABLE.pocketRadius * scaleX, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of balls) {
      if (b.potted) continue;
      ctx.beginPath();
      ctx.arc(b.x * scaleX, b.y * scaleY, b.r * scaleX, 0, Math.PI * 2);
      ctx.fillStyle = BALL_COLORS[b.id] || "#fff";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.stroke();
      if (b.id !== "cue") {
        ctx.fillStyle = "#fff"; ctx.font = `${b.r * scaleX}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(String(b.id), b.x * scaleX, b.y * scaleY + b.r * scaleX * 0.35);
      }
    }
    // Aim line for the player whose turn it is
    if (myTurn && !animating) {
      const cue = balls.find((b) => b.id === "cue" && !b.potted);
      if (cue) {
        const rad = (angle * Math.PI) / 180;
        ctx.strokeStyle = "rgba(255,255,255,.5)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cue.x * scaleX, cue.y * scaleY);
        ctx.lineTo((cue.x + Math.cos(rad) * 20) * scaleX, (cue.y + Math.sin(rad) * 20) * scaleY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [balls, angle, myTurn, animating]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({ gameId: "8ball", uid: user.uid, name: profile?.displayName || "Player", initialState: {} });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "8ball"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing" || match.setupDone) return;
    if (match.hostUid !== user.uid) return;
    const [p1, p2] = match.players;
    updateCasualMatch(matchId, { balls: rackedBalls(), turnUid: p1.uid, setupDone: true, potted: { [p1.uid]: [], [p2.uid]: [] } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, match?.setupDone]);

  function shoot() {
    if (!myTurn) return;
    const cue = balls.find((b) => b.id === "cue" && !b.potted);
    if (!cue) return;
    const rad = (angle * Math.PI) / 180;
    const speed = (power / 100) * 2.6;
    const shotBalls = balls.map((b) => (b.id === "cue" ? { ...b, vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed } : { ...b }));

    setAnimating(true);
    let frame = shotBalls;
    function animate() {
      frame = stepPhysics(frame, TABLE);
      setDisplayBalls(frame.map((b) => ({ ...b })));
      if (!isSettled(frame)) { rafRef.current = requestAnimationFrame(animate); return; }
      finishShot(shotBalls);
    }
    rafRef.current = requestAnimationFrame(animate);
  }

  async function finishShot(shotBalls) {
    const { balls: finalBalls, newlyPotted } = simulateShot(shotBalls, TABLE);
    setAnimating(false);
    setDisplayBalls(null);

    const cuePotted = newlyPotted.includes("cue");
    const eightPotted = newlyPotted.includes(8);
    const objectPotted = newlyPotted.filter((id) => id !== "cue" && id !== 8);
    const myPotted = [...(potted[user.uid] || []), ...objectPotted];
    const oppPotted = potted[opponent.uid] || [];
    const allObjectBallsCleared = myPotted.length >= 7;

    let restored = finalBalls;
    if (cuePotted) {
      restored = finalBalls.map((b) => (b.id === "cue" ? { ...b, potted: false, x: 25, y: 25, vx: 0, vy: 0 } : b));
    }

    const patch = { balls: restored, potted: { ...potted, [user.uid]: myPotted } };
    if (eightPotted) {
      patch.status = "finished";
      patch.winner = allObjectBallsCleared ? user.uid : opponent.uid; // potted the 8 early = instant loss
    } else if (cuePotted || objectPotted.length === 0) {
      patch.turnUid = opponent.uid; // foul or no ball potted — turn passes
    } else {
      patch.turnUid = user.uid; // potted a ball cleanly — shoot again
    }

    try { await updateCasualMatch(matchId, patch); }
    catch (e) { setError(e.message || "Shot save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">🎱 8 Ball Pool</h1>
            <p className="text-sm text-mist">1v1 real-time • real physics table, free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🎱</div>
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
          <span>You potted: {(potted[user.uid] || []).length}/7</span>
          <span>{opponent?.name}: {(potted[opponent?.uid] || []).length}/7</span>
        </div>

        <div className="mx-4 mt-2 overflow-hidden rounded-xl ring-1 ring-white/10">
          <canvas ref={canvasRef} width={340} height={170} className="w-full" />
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
              {myTurn ? "🎱 Shoot" : animating ? "Ball rolling…" : "Opponent's turn…"}
            </button>
          </div>
        )}

        {phase === "finished" && (
          <div className="mx-4 mt-6">
            <button
              onClick={() => { setMatchId(null); setMatch(null); setDisplayBalls(null); setPhase("setup"); }}
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
