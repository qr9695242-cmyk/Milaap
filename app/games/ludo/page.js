// Ludo entry is paid in Coins. The two-player pot is converted to Diamonds at 2.5 Coins = 1 Diamond and credited to the winner's in-app Diamonds balance.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { friendlyFirebaseError } from "@/lib/errors";
import {
  COLORS, COLOR_META, PATH, HOME_STRETCH, START_INDEX, SAFE_INDICES,
  YARD_ORIGIN, HOME_YARD_OFFSETS, FINISH_STEP, createInitialTokens,
  getMovableTokens, applyMove, rollDice, cellForToken,
} from "@/lib/ludoEngine";
import {
  LUDO_STAKES, listenWaitingLudoMatches, listenLudoMatch,
  createLudoMatch, joinLudoMatch, joinLudoByCode, rollLudoMatch, moveLudoToken, cancelWaitingLudoMatch,
  coinsToLudoDiamonds,
} from "@/lib/ludoMatches";

function classifyCell(r, c) {
  for (const color of COLORS) {
    const idx = HOME_STRETCH[color].findIndex(([hr, hc]) => hr === r && hc === c);
    if (idx !== -1) return { kind: "stretch", color };
  }
  if (r === 7 && c === 7) return { kind: "center" };
  const pIdx = PATH.findIndex(([pr, pc]) => pr === r && pc === c);
  if (pIdx !== -1) {
    const startColor = COLORS.find((col) => START_INDEX[col] === pIdx);
    return { kind: "path", safe: SAFE_INDICES.has(pIdx), startColor: startColor || null };
  }
  if (r === 6 && c === 6) return { kind: "triangle", color: "red" };
  if (r === 6 && c === 8) return { kind: "triangle", color: "blue" };
  if (r === 8 && c === 8) return { kind: "triangle", color: "yellow" };
  if (r === 8 && c === 6) return { kind: "triangle", color: "green" };
  if (r <= 5 && c <= 5) return { kind: r >= 1 && r <= 4 && c >= 1 && c <= 4 ? "yard-inner" : "yard-border", color: "red" };
  if (r <= 5 && c >= 9) return { kind: r >= 1 && r <= 4 && c >= 10 && c <= 13 ? "yard-inner" : "yard-border", color: "blue" };
  if (r >= 9 && c >= 9) return { kind: r >= 10 && r <= 13 && c >= 10 && c <= 13 ? "yard-inner" : "yard-border", color: "yellow" };
  if (r >= 9 && c <= 5) return { kind: r >= 10 && r <= 13 && c >= 1 && c <= 4 ? "yard-inner" : "yard-border", color: "green" };
  return { kind: "blank" };
}
const GRID_CELLS = Array.from({ length: 15 }, (_, r) => Array.from({ length: 15 }, (_, c) => classifyCell(r, c)));
function cellBg(info) {
  if (info.kind === "path") return info.startColor ? `${COLOR_META[info.startColor].hex}33` : "rgb(var(--color-panel2))";
  if (info.kind === "stretch") return `${COLOR_META[info.color].hex}55`;
  if (info.kind === "triangle") return `${COLOR_META[info.color].hex}2b`;
  if (info.kind === "yard-border") return COLOR_META[info.color].hex;
  if (info.kind === "yard-inner") return "rgb(var(--color-panel))";
  if (info.kind === "center") return "rgb(var(--color-panel2))";
  return "transparent";
}
const formatCoins = (n) => Number(n || 0).toLocaleString();
const emptyTokens = () => createInitialTokens(["red", "yellow"]);

export default function LudoPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [quickSearchStartedAt, setQuickSearchStartedAt] = useState(null);
  const [mode, setMode] = useState("quick");
  const [stake, setStake] = useState(LUDO_STAKES[0]);
  const [playerCount, setPlayerCount] = useState(2);
  const [waitingRooms, setWaitingRooms] = useState([]);
  const [matchId, setMatchId] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [localTokens, setLocalTokens] = useState(() => emptyTokens());
  const [localTurnIdx, setLocalTurnIdx] = useState(0);
  const [localDice, setLocalDice] = useState(null);
  const [localSelectable, setLocalSelectable] = useState([]);
  const [localSix, setLocalSix] = useState(0);
  const [localWinner, setLocalWinner] = useState(null);
  const [localMessage, setLocalMessage] = useState("Match entry choose karein.");

  useEffect(() => {
    if (!user) return;
    return listenWaitingLudoMatches(setWaitingRooms, (err) => {
      console.error("[ludo] waiting matches listener failed:", err);
      setError(friendlyFirebaseError(err, "Matches load nahi huay. Dobara try karein."));
    });
  }, [user]);

  useEffect(() => {
    if (!matchId) return;
    return listenLudoMatch(matchId, (next) => {
      setMatch(next);
      if (!next) return;
      if (next.status === "waiting") {
        if (next.mode === "quick") setPhase("searching");
        else setPhase("waiting");
      } else if (next.status === "playing") {
        // Show a short opponent-found confirmation before opening the board.
        setPhase((prev) => (prev === "searching" || prev === "found" ? "found" : "online"));
      } else if (next.status === "finished") setPhase("finished");
    }, (err) => {
      console.error("[ludo] match listener failed:", err);
      setError(friendlyFirebaseError(err, "Match sync error. Dobara try karein."));
    });
  }, [matchId]);

  useEffect(() => {
    if (phase !== "found") return;
    const timer = setTimeout(() => setPhase("online"), 2200);
    return () => clearTimeout(timer);
  }, [phase]);

  const onlinePlayer = match?.players?.find((p) => p.uid === user?.uid);
  const onlineColor = onlinePlayer?.color;
  const onlineTurnColor = match?.activeColors?.[match?.turnIdx || 0];
  const canOnlineRoll = phase === "online" && match?.status === "playing" && onlineColor === onlineTurnColor && match?.canRoll && !rolling;

  function startLocal() {
    setLocalTokens(emptyTokens()); setLocalTurnIdx(0); setLocalDice(null); setLocalSelectable([]); setLocalSix(0); setLocalWinner(null);
    setLocalMessage("Red ka turn — dice roll karein!"); setPhase("local");
  }

  async function startMatch(matchMode) {
    if (!user) return;
    setError(""); setBusy(true);
    try {
      const found = waitingRooms.find((r) => r.stake === stake && r.mode === "quick" && Number(r.playerCount || 2) === playerCount && !(r.playerUids || []).includes(user.uid) && (r.players || []).length < playerCount);
      if (matchMode === "quick" && found) {
        await joinLudoMatch({ matchId: found.id, name: profile?.displayName || "Player" });
        setMatchId(found.id);
        setQuickSearchStartedAt(Date.now());
        setPhase("found");
      } else {
        const created = await createLudoMatch({ name: profile?.displayName || "Player", stake, mode: matchMode, playerCount });
        setMatchId(created.matchId);
        setRoomCode(created.roomCode);
        setQuickSearchStartedAt(matchMode === "quick" ? Date.now() : null);
        setPhase(matchMode === "quick" ? "searching" : "waiting");
      }
    } catch (e) { setError(friendlyFirebaseError(e, "Match create nahi hua.")); }
    finally { setBusy(false); }
  }

  async function joinWaiting(id) {
    setBusy(true); setError("");
    try {
      await joinLudoMatch({ matchId: id, name: profile?.displayName || "Player" });
      setMatchId(id); setQuickSearchStartedAt(Date.now()); setPhase("found");
    } catch (e) { setError(friendlyFirebaseError(e, "Join nahi hua.")); }
    finally { setBusy(false); }
  }

  async function joinCode() {
    if (!roomCode.trim()) return;
    setBusy(true); setError("");
    try { const id = await joinLudoByCode({ roomCode, name: profile?.displayName || "Player" }); setMatchId(id); setPhase("online"); }
    catch (e) { setError(friendlyFirebaseError(e, "Room join nahi hua.")); }
    finally { setBusy(false); }
  }

  function localNextTurn() {
    const next = (localTurnIdx + 1) % 2; setLocalTurnIdx(next); setLocalDice(null); setLocalSelectable([]); setLocalSix(0);
    setLocalMessage(`${COLOR_META[["red", "yellow"][next]].label} ka turn — dice roll karein!`);
  }
  function localFinishMove(dice) {
    if (dice === 6 && localSix + 1 < 3) { setLocalSix((s) => s + 1); setLocalDice(null); setLocalMessage(`${COLOR_META[["red", "yellow"][localTurnIdx]].label} ko dobara turn mila.`); }
    else localNextTurn();
  }
  function localMove(tokenId, dice) {
    const color = ["red", "yellow"][localTurnIdx];
    const out = applyMove(localTokens, color, tokenId, dice); setLocalTokens(out.tokensByColor); setLocalSelectable([]);
    if (out.won) { setLocalWinner(color); setPhase("localFinished"); setLocalMessage(`${COLOR_META[color].label} wins!`); return; }
    localFinishMove(dice);
  }
  function localRoll() {
    if (rolling) return; setRolling(true);
    setTimeout(() => { const value = rollDice(); setLocalDice(value); setRolling(false); const color = ["red", "yellow"][localTurnIdx]; const movable = getMovableTokens(localTokens, color, value);
      if (!movable.length) { setLocalMessage(`${COLOR_META[color].label} ki valid move nahi hai.`); setTimeout(localNextTurn, 500); }
      else if (movable.length === 1) setTimeout(() => localMove(movable[0].id, value), 250);
      else { setLocalSelectable(movable.map((t) => t.id)); setLocalMessage("Token select karein."); }
    }, 350);
  }

  async function onlineRoll() {
    if (!canOnlineRoll) return;
    setRolling(true); setError("");
    try {
      await rollLudoMatch(matchId);
    } catch (e) {
      setError(friendlyFirebaseError(e, "Roll failed."));
    } finally {
      setRolling(false);
    }
  }
  async function onlineMove(tokenId) {
    if (!match || onlineColor !== onlineTurnColor) return;
    setError("");
    try {
      await moveLudoToken(matchId, tokenId);
    } catch (e) {
      setError(friendlyFirebaseError(e, "Move failed."));
    }
  }

  const displayTokens = phase === "local" || phase === "localFinished" ? localTokens : (match?.tokensByColor || emptyTokens());
  const activeColors = phase === "local" || phase === "localFinished" ? ["red", "yellow"] : (match?.activeColors || ["red", "yellow"]);
  const currentColor = activeColors[phase === "local" || phase === "localFinished" ? localTurnIdx : (match?.turnIdx || 0)];
  const diceValue = phase === "local" || phase === "localFinished" ? localDice : match?.diceValue;
  const selectableIds = phase === "local" || phase === "localFinished" ? localSelectable : (match?.selectableIds || []);
  const message = phase === "local" || phase === "localFinished" ? localMessage : (match?.message || "");

  const occupancy = useMemo(() => {
    const map = new Map(); const add = (r, c, entry) => { const key = `${r},${c}`; if (!map.has(key)) map.set(key, []); map.get(key).push(entry); };
    for (const color of activeColors) (displayTokens[color] || []).forEach((t, i) => {
      if (t.relativePos === -1) { const [or, oc] = YARD_ORIGIN[color]; const [dr, dc] = HOME_YARD_OFFSETS[i]; add(or + dr, oc + dc, { color, tokenId: t.id, movable: selectableIds.includes(t.id) }); }
      else if (t.relativePos < FINISH_STEP) { const cell = cellForToken(color, t.relativePos); if (cell) add(cell[0], cell[1], { color, tokenId: t.id, movable: selectableIds.includes(t.id) }); }
    }); return map;
  }, [displayTokens, activeColors, selectableIds]);

  if (loading || !user) return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;

  if (phase === "setup") return (
    <main className="min-h-screen bg-void text-ink pb-10">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4"><Link href="/" className="text-2xl text-mist">‹</Link><div><h1 className="font-display text-xl font-bold">Ludo Match</h1><p className="text-sm text-mist">2 ya 4 players ka real-time Ludo match</p></div></header>
      <div className="px-4 space-y-4">
        <div className="rounded-2xl bg-panel p-4"><div className="flex justify-between"><span className="text-mist">Your coins</span><b>{formatCoins(profile?.coins)}</b></div></div>
        <div><p className="mb-2 text-sm font-semibold">Players</p><div className="grid grid-cols-2 gap-2 mb-4"><button onClick={() => setPlayerCount(2)} className={`rounded-xl p-3 text-left ring-1 ${playerCount === 2 ? "bg-gradient-to-br from-teal-400 to-yellow-300 text-black ring-transparent" : "bg-panel text-ink ring-white/10"}`}><b>2 Players</b><span className="block text-xs opacity-70">2.5 Coins = 1 Diamond</span></button><button onClick={() => setPlayerCount(4)} className={`rounded-xl p-3 text-left ring-1 ${playerCount === 4 ? "bg-gradient-to-br from-teal-400 to-yellow-300 text-black ring-transparent" : "bg-panel text-ink ring-white/10"}`}><b>4 Players</b><span className="block text-xs opacity-70">3 Coins = 1 Diamond</span></button></div><p className="mb-2 text-sm font-semibold">Entry / Match Coins</p><div className="grid grid-cols-2 gap-2">{LUDO_STAKES.map((s) => <button key={s} onClick={() => setStake(s)} className={`rounded-xl p-3 text-left ring-1 ${stake === s ? "bg-gradient-to-br from-teal-400 to-yellow-300 text-black ring-transparent" : "bg-panel text-ink ring-white/10"}`}><b>{formatCoins(s)}</b><span className="block text-xs opacity-70">Winner: 💎 {coinsToLudoDiamonds(s * playerCount, playerCount).toLocaleString()}</span></button>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => startMatch("quick")} className="rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">⚡ Quick Match</button><button disabled={busy} onClick={() => startMatch("room")} className="rounded-xl bg-panel py-4 font-bold ring-1 ring-white/10">🔐 Create Room</button></div>
        <div className="rounded-2xl bg-panel p-4"><p className="text-sm font-semibold">Room code se join</p><div className="mt-2 flex gap-2"><input value={roomCode} onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 digit code" inputMode="numeric" className="min-w-0 flex-1 rounded-xl bg-panel2 px-3 py-3 outline-none"/><button disabled={busy} onClick={joinCode} className="rounded-xl bg-panel2 px-4 py-3 font-semibold">Join</button></div></div>
        <button onClick={startLocal} className="w-full rounded-xl bg-panel2 py-3 text-sm text-mist">Practice: Free Local Match</button>
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <div><div className="mb-2 flex justify-between"><p className="text-sm font-semibold">Open Quick Matches</p><span className="text-xs text-mist">{waitingRooms.filter(r => r.mode === "quick" && Number(r.playerCount || 2) === playerCount).length}</span></div>{waitingRooms.filter(r => r.mode === "quick" && Number(r.playerCount || 2) === playerCount && r.hostUid !== user.uid).map(r => <button key={r.id} onClick={() => { setStake(r.stake); joinWaiting(r.id); }} className="mb-2 flex w-full items-center justify-between premium-card p-3 text-left"><span><b>{r.players?.[0]?.name || "Player"}</b><span className="ml-2 text-xs text-mist">{formatCoins(r.stake)} coins</span></span><span className="rounded-lg bg-teal-400 px-3 py-1 text-xs font-bold text-black">Join</span></button>)}</div>
      </div>
    </main>
  );

  if (phase === "searching") return (
    <main className="min-h-screen bg-void text-ink flex items-center justify-center px-5">
      <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
        <Link href="/games/ludo" className="absolute left-5 top-6 text-2xl text-mist">‹</Link>
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🎲</div>
        <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
        <p className="mt-2 text-sm text-mist">Same entry coins wala real player dhoonda ja raha hai.</p>
        <div className="mx-auto mt-6 h-2 w-44 overflow-hidden rounded-full bg-panel2"><div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-teal-400 to-yellow-300" /></div>
        <div className="mt-6 rounded-2xl bg-panel2 p-4 text-left text-sm">
          <div className="flex justify-between"><span className="text-mist">Entry Coins</span><b>{formatCoins(match?.stake || stake)}</b></div>
          <div className="mt-2 flex justify-between"><span className="text-mist">Players / Pot</span><b>{match?.players?.length || 1}/{match?.playerCount || playerCount} · {formatCoins(match?.pot || stake * playerCount)}</b></div>
          <div className="mt-2 flex justify-between"><span className="text-mist">Winner Diamonds</span><b className="text-gold">💎 {coinsToLudoDiamonds((match?.pot || stake * playerCount), match?.playerCount || playerCount).toLocaleString()}</b></div>
        </div>
        <p className="mt-4 text-xs text-mist">Search active{quickSearchStartedAt ? ` · ${Math.max(1, Math.floor((Date.now() - quickSearchStartedAt) / 1000))}s` : ""}</p>
        <button disabled={busy} onClick={async () => { try { setBusy(true); await cancelWaitingLudoMatch({ matchId, uid: user.uid }); setMatchId(null); setMatch(null); setQuickSearchStartedAt(null); setPhase("setup"); } catch (e) { setError(friendlyFirebaseError(e, "Cancel failed.")); } finally { setBusy(false); } }} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">{busy ? "Cancelling…" : "Cancel & Refund Coins"}</button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  );

  if (phase === "found") {
    const opponents = (match?.players || []).filter((p) => p.uid !== user.uid);
    const my = match?.players?.find((p) => p.uid === user.uid);
    const count = match?.playerCount || playerCount;
    const diamonds = coinsToLudoDiamonds(match?.pot || stake * count, count);
    return (
      <main className="min-h-screen bg-void text-ink flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-panel p-6 text-center ring-1 ring-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Opponent found!</p>
          <div className="mt-6 flex items-center justify-center gap-5">
            <div><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-400/20 text-3xl">👤</div><p className="mt-2 text-sm font-semibold">{my?.name || "You"}</p></div>
            <span className="text-xl font-black text-mist">VS</span>
            <div className="flex flex-wrap justify-center gap-3">{opponents.map((op) => <div key={op.uid}><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-300/20 text-2xl">👤</div><p className="mt-2 text-xs font-semibold">{op.name || "Player"}</p></div>)}</div>
          </div>
          <div className="mt-6 rounded-2xl bg-panel2 p-4 text-left text-sm">
            <div className="flex justify-between"><span className="text-mist">Entry Coins</span><b>{formatCoins(match?.stake || stake)}</b></div>
            <div className="mt-2 flex justify-between"><span className="text-mist">Players / Pot</span><b>{count} · {formatCoins(match?.pot || stake * count)}</b></div>
            <div className="mt-2 flex justify-between"><span className="text-mist">Winner Gets</span><b className="text-gold">💎 {diamonds.toLocaleString()}</b></div>
            <p className="mt-2 text-[11px] text-mist">{count === 4 ? "3 Coins = 1 Diamond" : "2.5 Coins = 1 Diamond"}</p>
          </div>
          <div className="mt-5 rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">Starting match…</div>
        </div>
      </main>
    );
  }

  if (phase === "waiting") return <main className="min-h-screen bg-void text-ink flex items-center justify-center px-5"><div className="w-full max-w-sm rounded-3xl bg-panel p-6 text-center"><div className="text-5xl">🔐</div><h1 className="mt-3 font-display text-xl font-bold">Room Ready</h1><p className="mt-2 text-sm text-mist">Opponent ko ye code bhejein</p><div className="my-5 rounded-2xl bg-panel2 py-5 text-4xl font-black tracking-[0.3em]">{roomCode || match?.roomCode}</div><p className="text-xs text-mist">Entry: {formatCoins(match?.stake || stake)} coins · Pot: {formatCoins(match?.pot || stake * playerCount)}</p><button disabled={busy} onClick={async () => { try { setBusy(true); await cancelWaitingLudoMatch({ matchId, uid: user.uid }); setMatchId(null); setMatch(null); setPhase("setup"); } catch (e) { setError(friendlyFirebaseError(e, "Cancel failed.")); } finally { setBusy(false); } }} className="mt-5 text-sm text-mist">{busy ? "Cancelling…" : "Cancel & Refund Coins"}</button></div></main>;

  if (phase === "online" || phase === "finished" || phase === "local" || phase === "localFinished") return (
    <main className="min-h-screen bg-void text-ink flex flex-col pb-8">
      <header className="flex items-center gap-3 px-4 pt-6 pb-2"><button onClick={() => { setMatchId(null); setMatch(null); setPhase("setup"); }} className="text-2xl text-mist">‹</button><div><h1 className="font-display text-xl font-bold">Ludo</h1><p className="text-sm text-mist">{phase.startsWith("local") ? "Free local practice" : `${formatCoins(match?.stake)} coin real-time ${match?.playerCount || 2}-player match`}</p></div></header>
      {phase === "online" && <div className="mx-4 mb-2 rounded-xl bg-panel px-3 py-2 text-xs flex justify-between"><span>Room: <b>{match?.roomCode}</b></span><span>Pot: <b>{formatCoins(match?.pot)}</b></span></div>}
      <div className="grid grid-cols-2 gap-2 px-4 py-3">{activeColors.map(color => <div key={color} className="rounded-xl px-3 py-2 flex items-center justify-between bg-panel" style={(color === currentColor && (phase === "local" || onlineTurnColor === color)) ? {boxShadow:`0 0 0 2px ${COLOR_META[color].hex}`} : undefined}><span className="flex items-center gap-2 text-sm"><span className="h-3 w-3 rounded-full" style={{background:COLOR_META[color].hex}}/>{match?.players?.find(p=>p.color===color)?.name || COLOR_META[color].label}</span><span className="text-xs text-mist">{(displayTokens[color]||[]).filter(t=>t.relativePos===FINISH_STEP).length}/4</span></div>)}</div>
      <div className="px-4"><div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10" style={{display:"grid",gridTemplateColumns:"repeat(15,1fr)",gridTemplateRows:"repeat(15,1fr)"}}>{GRID_CELLS.flatMap((row,r)=>row.map((info,c)=>{const key=`${r},${c}`, occupants=occupancy.get(key)||[]; return <div key={key} className="relative flex items-center justify-center" style={{background:cellBg(info),border:info.kind==="path"||info.kind==="stretch"?"1px solid rgba(255,255,255,0.06)":undefined}}>{info.kind==="path"&&info.safe&&!info.startColor&&<span className="text-[8px] text-mist">★</span>}{info.kind==="center"&&<span className="text-lg">🏁</span>}{occupants.length>0&&<div className="absolute inset-0 flex flex-wrap items-center justify-center gap-[1px] p-[1px]">{occupants.map(o=><button key={o.tokenId} onClick={(e)=>{e.stopPropagation(); if(phase.startsWith("local")) localMove(o.tokenId,localDice); else onlineMove(o.tokenId);}} disabled={!o.movable} className="rounded-full" style={{width:occupants.length>1?"48%":"72%",height:occupants.length>1?"48%":"72%",background:COLOR_META[o.color].hex,border:o.movable?"2px solid white":"1px solid rgba(0,0,0,.4)",boxShadow:o.movable?"0 0 6px 1px rgba(255,255,255,.8)":undefined}}/>)}</div>}</div>}))}</div></div>
      <div className="flex flex-col items-center gap-4 pt-6"><p className="px-8 text-center text-sm text-mist">{message}</p><button onClick={phase.startsWith("local") ? localRoll : onlineRoll} disabled={phase === "finished" || phase === "localFinished" || (phase === "online" && !canOnlineRoll) || rolling} className={`h-20 w-20 rounded-2xl flex items-center justify-center text-4xl font-bold ${(!rolling && (phase.startsWith("local") || canOnlineRoll)) ? "bg-gradient-to-br from-teal-400 to-yellow-300 text-black" : "bg-panel2 text-mist"}`}>{rolling?"🎲":diceValue??"🎲"}</button>{(phase === "finished" || phase === "localFinished")&&<div className="text-center"><p className="font-display text-lg font-bold">🏆 Match Finished</p><p className="mt-1 text-sm text-mist">{match?.winner===user.uid || localWinner===onlineColor ? "Aap winner hain!" : "Winner match complete ho gaya."}</p>{phase==="finished" && match?.winner===user.uid && <p className="mt-2 text-2xl font-bold text-gold">💎 {(match?.diamondsWon ?? coinsToLudoDiamonds(match?.pot)).toLocaleString()}</p>}{phase==="finished" && match?.winner===user.uid && <p className="mt-1 text-xs text-mist">Wallet ke Diamonds balance mein credit ho gaye</p>}<button onClick={()=>{setMatchId(null);setMatch(null);setPhase("setup");}} className="mt-4 rounded-xl bg-gradient-to-r from-teal-400 to-yellow-300 px-6 py-2 font-semibold text-black">New Match</button></div>}{error&&<p className="px-5 text-center text-sm text-red-300">{error}</p>}</div>
    </main>
  );
  return null;
}
