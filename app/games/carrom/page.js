"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch, settleCasualCoinMatch } from "@/lib/casualMatches";
import { simulateCarromShot, angleToVector, distance } from "@/lib/aimEngine";

const STAKES = [0, 100, 500, 1000, 5000];
const ROUNDS = 3;
const STRIKER_POS = { x: 150, y: 258 };
const POCKETS = [{ x: 22, y: 22 }, { x: 278, y: 22 }, { x: 22, y: 278 }, { x: 278, y: 278 }];

function randomCoinPos(seed) {
  // Deterministic-ish per round so both players aim at the same layout.
  const rx = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const ry = Math.abs(Math.sin(seed * 78.233) * 12543.111) % 1;
  return { x: 110 + rx * 80, y: 100 + ry * 80 };
}

export default function CarromPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [stake, setStake] = useState(0);
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [angle, setAngle] = useState(270);
  const [power, setPower] = useState(60);
  const [lastShot, setLastShot] = useState(null);
  const [soloRound, setSoloRound] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [soloBotScore, setSoloBotScore] = useState(0);

  const coinPos = useMemo(() => randomCoinPos((match?.round || 0) + 1), [match?.round]);

  useEffect(() => {
    if (!matchId) return;
    return listenCasualMatch(matchId, (next) => {
      setMatch(next);
      if (!next) return;
      if (next.status === "waiting") setPhase("searching");
      else if (next.status === "playing") setPhase("playing");
      else if (next.status === "finished") setPhase("finished");
      setLocked(false); setLastShot(null);
    }, (err) => setError(err.message || "Match sync error."));
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !match || match.status !== "finished" || stake <= 0 || !user?.uid) return;
    settleCasualCoinMatch(matchId, user.uid).catch((e) => setError(e.message || "Coin settle nahi hua."));
  }, [matchId, match?.status, stake, user?.uid]);

  if (loading || !user) return <main className="game-screen game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;

  function startSolo() {
    setSoloRound(0); setSoloScore(0); setSoloBotScore(0); setLastShot(null); setLocked(false); setError(""); setPhase("solo");
  }

  async function startMatch() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: `carrom-${stake}`, uid: user.uid, name: profile?.displayName || "Player",
        initialState: { stakeCoins: stake, round: 0, scores: { [user.uid]: 0 }, roundLocked: {} },
      });
      setMatchId(id); setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, `carrom-${stake}`); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  async function shoot() {
    if (locked) return;
    if (phase === "solo") {
      setLocked(true);
      const result = simulateCarromShot({ strikerPos: STRIKER_POS, angleDeg: angle, power, coinPos, pockets: POCKETS });
      let points = result.potted ? 100 : result.hit ? Math.max(0, Math.round(55 - Math.min(...POCKETS.map((p) => distance(result.coinFinal.x, result.coinFinal.y, p.x, p.y))) / 5)) : 0;
      setLastShot({ ...result, points });
      const bot = Math.floor(35 + Math.random() * 66);
      const nextRound = soloRound + 1;
      setTimeout(() => {
        const nextMine = soloScore + points; const nextBot = soloBotScore + bot;
        setSoloScore(nextMine); setSoloBotScore(nextBot); setSoloRound(nextRound); setLocked(false);
        if (nextRound >= ROUNDS) setPhase("soloFinished");
        else setLastShot(null);
      }, 650);
      return;
    }
    if (!match) return;
    setLocked(true);
    const result = simulateCarromShot({ strikerPos: STRIKER_POS, angleDeg: angle, power, coinPos, pockets: POCKETS });
    let points = 0;
    if (result.potted) points = 100;
    else if (result.hit) {
      const nearest = Math.min(...POCKETS.map((p) => distance(result.coinFinal.x, result.coinFinal.y, p.x, p.y)));
      points = Math.max(0, Math.round(55 - nearest / 5));
    }
    setLastShot({ ...result, points });

    const mine = { ...(match.roundLocked || {}), [user.uid]: points };
    const both = (match.playerUids || []).every((uid) => mine[uid] !== undefined);
    const patch = { [`roundLocked.${user.uid}`]: points };
    if (both) {
      const next = (match.round || 0) + 1;
      const opp = (match.playerUids || []).find((uid) => uid !== user.uid);
      const myTotal = (match.scores?.[user.uid] || 0) + points;
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
        <div><h1 className="font-display text-xl font-bold">🎯 Carrom</h1><p className="text-sm text-mist">Real striker physics • pocket</p></div>
      </header>
      <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
        <div className="text-center"><div className="text-6xl">🎯</div><h2 className="mt-3 text-lg font-bold">Match Setup</h2></div>
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
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl">🎯</div>
        <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
        <button disabled={busy} onClick={cancel} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">{busy ? "Cancelling…" : "Cancel"}</button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  );

  if (phase === "playing" || phase === "solo") {
    const opponent = match?.players?.find((p) => p.uid !== user.uid);
    const mine = phase === "solo" ? soloScore : (match?.scores?.[user.uid] || 0), theirs = phase === "solo" ? soloBotScore : (match?.scores?.[opponent?.uid] || 0);
    const vec = angleToVector(angle);
    const previewLen = (power / 100) * 200;
    const previewEnd = { x: STRIKER_POS.x + vec.dx * previewLen, y: STRIKER_POS.y + vec.dy * previewLen };
    const shownCoin = lastShot ? lastShot.coinFinal : coinPos;
    return (
      <main className="game-screen min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3"><Link href="/games" className="text-2xl text-mist">‹</Link><p className="text-sm font-semibold">Round {(phase === "solo" ? soloRound : (match?.round || 0)) + 1}/{ROUNDS}</p><span className="text-xs text-mist">You {mine} — {theirs} {phase === "solo" ? "Computer" : (opponent?.name || "…")}</span></header>
        <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
          <p className="text-center text-xs text-mist">Angle aur power set karein, phir Shoot karein — striker coin ko pocket ki taraf bhejega.</p>
          <svg viewBox="0 0 300 300" className="mt-4 w-full rounded-2xl bg-amber-900/40">
            <rect x="8" y="8" width="284" height="284" rx="10" fill="#7C4A2D" stroke="#3F2415" strokeWidth="4" />
            {POCKETS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={16} fill="#0B0B0B" />)}
            <circle cx={shownCoin.x} cy={shownCoin.y} r={11} fill="#F5F5F0" stroke="#00000055" />
            <circle cx={STRIKER_POS.x} cy={STRIKER_POS.y} r={10} fill="#DC2626" stroke="#fff" strokeWidth={1} />
            {!locked && <line x1={STRIKER_POS.x} y1={STRIKER_POS.y} x2={previewEnd.x} y2={previewEnd.y} stroke="#FACC15" strokeDasharray="6 4" strokeWidth={2} />}
          </svg>
          {lastShot && <p className="mt-3 text-center text-sm font-bold text-yellow-200">{lastShot.reason} • {lastShot.points} points</p>}
          <div className="mt-5">
            <label className="text-xs text-mist">Angle: {angle}°</label>
            <input type="range" min="0" max="360" value={angle} onChange={(e) => setAngle(Number(e.target.value))} disabled={locked} className="w-full" />
          </div>
          <div className="mt-3">
            <label className="text-xs text-mist">Power: {power}%</label>
            <input type="range" min="10" max="100" value={power} onChange={(e) => setPower(Number(e.target.value))} disabled={locked} className="w-full" />
          </div>
          <button disabled={locked} onClick={shoot} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60">{locked ? (phase === "solo" ? "Computer turn…" : "Waiting for opponent…") : "🎯 Shoot"}</button>
        </section>
        {error && <p className="mx-4 mt-3 text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  if (phase === "soloFinished") return (
    <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5"><div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10"><div className="text-6xl">{soloScore >= soloBotScore ? "🏆" : "😔"}</div><h1 className="mt-4 text-2xl font-bold">{soloScore >= soloBotScore ? "You Won!" : "Computer Won"}</h1><p className="mt-2 text-sm text-mist">Solo Carrom • You {soloScore} — {soloBotScore} Computer</p><button onClick={startSolo} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">Play Again</button></div></main>
  );

  if (phase === "finished") {
    const opponent = match?.players?.find((p) => p.uid !== user.uid);
    const mine = phase === "solo" ? soloScore : (match?.scores?.[user.uid] || 0), theirs = phase === "solo" ? soloBotScore : (match?.scores?.[opponent?.uid] || 0);
    const won = match.winner === user.uid, draw = !match.winner;
    return <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5"><div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10"><div className="text-6xl">{draw ? "🤝" : won ? "🏆" : "😔"}</div><h1 className="mt-4 text-2xl font-bold">{draw ? "Draw" : won ? "You Won!" : "You Lost"}</h1><p className="mt-2 text-sm text-mist">Carrom • You {mine} — {theirs} {opponent?.name || ""}</p>{stake > 0 && <p className="mt-2 text-xs text-yellow-200">🪙 Coin Match: {stake} entry</p>}<button onClick={() => { setMatchId(null); setMatch(null); setPhase("setup"); }} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">Play Again</button></div></main>;
  }
  return null;
}
