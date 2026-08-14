"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch, settleCasualCoinMatch } from "@/lib/casualMatches";
import { archeryScore, clamp, distance } from "@/lib/aimEngine";

const STAKES = [0, 200000, 500000, 1000000, 2000000, 5000000];
const ROUNDS = 3;
const CENTER = { x: 150, y: 150 };
const RADIUS = 135;
const RING_COLORS = ["#F5F5F5", "#F5F5F5", "#111827", "#111827", "#1D4ED8", "#1D4ED8", "#DC2626", "#DC2626", "#FACC15", "#FACC15"];

export default function ArcheryPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [stake, setStake] = useState(0);
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [aim, setAim] = useState(null); // {x,y} within the SVG board
  const [lastShot, setLastShot] = useState(null);
  const [soloRound, setSoloRound] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [soloBotScore, setSoloBotScore] = useState(0);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!matchId) return;
    return listenCasualMatch(matchId, (next) => {
      setMatch(next);
      if (!next) return;
      if (next.status === "waiting") setPhase("searching");
      else if (next.status === "playing") setPhase("playing");
      else if (next.status === "finished") setPhase("finished");
      setLocked(false); setAim(null); setLastShot(null);
    }, (err) => setError(err.message || "Match sync error."));
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !match || match.status !== "finished" || stake <= 0 || !user?.uid) return;
    settleCasualCoinMatch(matchId, user.uid).catch((e) => setError(e.message || "Coin settle nahi hua."));
  }, [matchId, match?.status, stake, user?.uid]);

  if (loading || !user) return <main className="game-screen game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;

  function startSolo() {
    setSoloRound(0); setSoloScore(0); setSoloBotScore(0); setAim(null); setLastShot(null); setLocked(false); setError(""); setPhase("solo");
  }

  async function startMatch() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: `archery-${stake}`, uid: user.uid, name: profile?.displayName || "Player",
        initialState: { stakeCoins: stake, round: 0, scores: { [user.uid]: 0 }, roundLocked: {} },
      });
      setMatchId(id); setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, `archery-${stake}`); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  function pickAim(e) {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 300;
    const y = ((clientY - rect.top) / rect.height) * 300;
    const d = distance(x, y, CENTER.x, CENTER.y);
    if (d > RADIUS + 20) return;
    setAim({ x: clamp(x, 0, 300), y: clamp(y, 0, 300) });
  }

  async function shoot() {
    if (!aim || locked) return;
    if (phase === "solo") {
      setLocked(true);
      const shakeAngle = Math.random() * Math.PI * 2;
      const shakeMag = Math.random() * 12;
      const landX = aim.x + Math.cos(shakeAngle) * shakeMag;
      const landY = aim.y + Math.sin(shakeAngle) * shakeMag;
      const result = archeryScore(landX, landY, CENTER, RADIUS);
      setLastShot({ x: landX, y: landY, ...result });
      const bot = Math.floor(45 + Math.random() * 56);
      const nextRound = soloRound + 1;
      setTimeout(() => {
        setSoloScore((v) => v + result.points); setSoloBotScore((v) => v + bot); setSoloRound(nextRound); setLocked(false);
        if (nextRound >= ROUNDS) setPhase("soloFinished"); else { setAim(null); setLastShot(null); }
      }, 650);
      return;
    }
    if (!match) return;
    setLocked(true);
    // Real hand-tremor: a small random deviation applied to the chosen aim point.
    const shakeAngle = Math.random() * Math.PI * 2;
    const shakeMag = Math.random() * 12;
    const landX = aim.x + Math.cos(shakeAngle) * shakeMag;
    const landY = aim.y + Math.sin(shakeAngle) * shakeMag;
    const result = archeryScore(landX, landY, CENTER, RADIUS);
    setLastShot({ x: landX, y: landY, ...result });

    const mine = { ...(match.roundLocked || {}), [user.uid]: result.points };
    const both = (match.playerUids || []).every((uid) => mine[uid] !== undefined);
    const patch = { [`roundLocked.${user.uid}`]: result.points };
    if (both) {
      const next = (match.round || 0) + 1;
      const opp = (match.playerUids || []).find((uid) => uid !== user.uid);
      const myTotal = (match.scores?.[user.uid] || 0) + result.points;
      const oppTotal = (match.scores?.[opp] || 0) + (mine[opp] || 0);
      patch[`scores.${user.uid}`] = myTotal;
      if (next >= ROUNDS) { patch.status = "finished"; patch.winner = myTotal === oppTotal ? null : (myTotal > oppTotal ? user.uid : opp); }
      else { patch.round = next; patch.roundLocked = {}; }
    }
    try { await updateCasualMatch(matchId, patch); }
    catch (e) { setError(e.message || "Score save nahi hua."); setLocked(false); }
  }

  if (phase === "setup") return (
    <main className="game-screen min-h-screen bg-void text-ink pb-10">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/games" className="text-2xl text-mist">‹</Link>
        <div><h1 className="font-display text-xl font-bold">🏹 Archery</h1><p className="text-sm text-mist">Real target • aim • bullseye</p></div>
      </header>
      <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
        <div className="text-center"><div className="text-6xl">🏹</div><h2 className="mt-3 text-lg font-bold">Match Setup</h2></div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => setStake(0)} className={`rounded-xl py-3 text-sm font-bold ${stake === 0 ? "bg-gradient-to-r from-teal-400 to-yellow-300 text-black" : "bg-white/10"}`}>🆓 Free Match</button>
          <button onClick={() => setStake(stake === 0 ? 100 : stake)} className={`rounded-xl py-3 text-sm font-bold ${stake > 0 ? "bg-gradient-to-r from-yellow-300 to-orange-400 text-black" : "bg-white/10"}`}>🪙 Coin Match</button>
        </div>
        {stake > 0 && <div className="mt-4 grid grid-cols-4 gap-2">{STAKES.slice(1).map((v) => <button key={v} onClick={() => setStake(v)} className={`rounded-xl py-2 text-xs font-bold ${stake === v ? "bg-yellow-300 text-black" : "bg-white/10"}`}>🪙 {v}</button>)}</div>}
        <div className="grid grid-cols-2 gap-2 mt-5"><button onClick={startSolo} className="rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">🤖 Solo Practice</button><button disabled={busy} onClick={startMatch} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60">{busy ? "Finding…" : "⚡ Quick Match"}</button></div>
        {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </section>
    </main>
  );

  if (phase === "searching") return (
    <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl">🏹</div>
        <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
        <button disabled={busy} onClick={cancel} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">{busy ? "Cancelling…" : "Cancel"}</button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  );

  if (phase === "playing" || phase === "solo") {
    const opponent = match?.players?.find((p) => p.uid !== user.uid);
    const mine = phase === "solo" ? soloScore : (match?.scores?.[user.uid] || 0), theirs = phase === "solo" ? soloBotScore : (match?.scores?.[opponent?.uid] || 0);
    return (
      <main className="game-screen min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3"><Link href="/games" className="text-2xl text-mist">‹</Link><p className="text-sm font-semibold">Round {(phase === "solo" ? soloRound : (match?.round || 0)) + 1}/{ROUNDS}</p><span className="text-xs text-mist">You {mine} — {theirs} {phase === "solo" ? "Computer" : (opponent?.name || "…")}</span></header>
        <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
          <p className="text-center text-xs text-mist">Target par tap karke aim set karein, phir Shoot dabayein.</p>
          <svg ref={svgRef} viewBox="0 0 300 300" onPointerDown={pickAim} className="mt-4 w-full touch-none rounded-2xl bg-panel2">
            {RING_COLORS.map((color, i) => <circle key={i} cx={CENTER.x} cy={CENTER.y} r={RADIUS - i * (RADIUS / 10)} fill={color} stroke="#00000033" />)}
            {aim && !lastShot && <circle cx={aim.x} cy={aim.y} r={6} fill="none" stroke="#22D3EE" strokeWidth={2} />}
            {lastShot && <circle cx={lastShot.x} cy={lastShot.y} r={6} fill="#22D3EE" stroke="#fff" strokeWidth={1.5} />}
          </svg>
          {lastShot && <p className="mt-3 text-center text-sm font-bold text-yellow-200">Ring {lastShot.ring} • {lastShot.points} points</p>}
          <button disabled={!aim || locked} onClick={shoot} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-40">{locked ? (phase === "solo" ? "Computer turn…" : "Waiting for opponent…") : "🏹 Shoot"}</button>
        </section>
        {error && <p className="mx-4 mt-3 text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  if (phase === "soloFinished") return (
    <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5"><div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10"><div className="text-6xl">{soloScore >= soloBotScore ? "🏆" : "😔"}</div><h1 className="mt-4 text-2xl font-bold">{soloScore >= soloBotScore ? "You Won!" : "Computer Won"}</h1><p className="mt-2 text-sm text-mist">Solo Archery • You {soloScore} — {soloBotScore} Computer</p><button onClick={startSolo} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">Play Again</button></div></main>
  );

  if (phase === "finished") {
    const opponent = match?.players?.find((p) => p.uid !== user.uid);
    const mine = phase === "solo" ? soloScore : (match?.scores?.[user.uid] || 0), theirs = phase === "solo" ? soloBotScore : (match?.scores?.[opponent?.uid] || 0);
    const won = match.winner === user.uid, draw = !match.winner;
    return <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5"><div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10"><div className="text-6xl">{draw ? "🤝" : won ? "🏆" : "😔"}</div><h1 className="mt-4 text-2xl font-bold">{draw ? "Draw" : won ? "You Won!" : "You Lost"}</h1><p className="mt-2 text-sm text-mist">Archery • You {mine} — {theirs} {opponent?.name || ""}</p>{stake > 0 && <p className="mt-2 text-xs text-yellow-200">🪙 Coin Match: {stake} entry</p>}<button onClick={() => { setMatchId(null); setMatch(null); setPhase("setup"); }} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">Play Again</button></div></main>;
  }
  return null;
}
