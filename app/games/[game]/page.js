"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { GAME_CATALOG } from "@/lib/premiumCatalog";

const DEDICATED_GAME_ROUTES = new Set([
 "ludo", "carrom", "chess", "archery", "lucky777", "crazyfruit", "giftwheel", "greedybaby",
 "greedyfarm", "crazygems", "fishing", "fortunelamp", "original777", "gatesofolympus",
]);
import {
 quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch, settleCasualCoinMatch,
} from "@/lib/casualMatches";

import { GAME_STAKES as STAKES } from "@/lib/gameEconomy";
const ROUNDS = 3;

const GAME_RULES = {
 carrom: { type:"carrom", title:"Carrom", icon:"🎯", subtitle:"Striker • pocket • 1v1", action:"Shoot", hint:"Striker ko pocket ke qareeb aim karo." },
 archery: { type:"aim", title:"Archery", icon:"🏹", subtitle:"Aim • target • bullseye", action:"Shoot", hint:"Bullseye ke center par aim karo." },
};

function seededItems(type, round) {
 const pools = {
 carrom:["⚪","⚫","🔴","⚪","⚫"],
 aim:["🎯","◉","◎"],
 };
 return pools[type] || pools.aim;
}

export default function GameDuelPage() {
 const { game } = useParams();
 const router = useRouter();
 useEffect(() => {
 if (DEDICATED_GAME_ROUTES.has(game)) router.replace(`/games/${game}`);
 }, [game, router]);
 const meta = GAME_CATALOG.find((x) => x.id === game) || GAME_CATALOG[0];
 const rule = GAME_RULES[game] || {
 type:"aim", title:meta.title, icon:meta.emoji, subtitle:"1v1 skill match",
 action:"Play", hint:"Timing aur accuracy se score banao."
 };
 const { user, profile, loading } = useAuth();

 const [phase,setPhase] = useState("setup");
 const [matchId,setMatchId] = useState(null);
 const [match,setMatch] = useState(null);
 const [stake,setStake] = useState(0);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [meter,setMeter] = useState(50);
 const [locked,setLocked] = useState(false);
 const [choice,setChoice] = useState(null);

 const items = useMemo(() => seededItems(rule.type, match?.round || 0), [rule.type, match?.round]);

 useEffect(() => {
 if (!matchId) return;
 return listenCasualMatch(matchId, next => {
 setMatch(next);
 if (!next) return;
 if (next.status==="waiting") setPhase("searching");
 else if (next.status==="playing") setPhase("playing");
 else if (next.status==="finished") setPhase("finished");
 setLocked(false);
 setChoice(null);
 }, err => setError(err.message || "Match sync error."));
 },[matchId]);

 useEffect(() => {
 if (phase!=="playing" || locked) return;
 let frame;
 const start=performance.now();
 const tick=(now)=>{
 const t=((now-start)%1800)/1800;
 setMeter(t<.5?t*200:(1-t)*200);
 frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);
 return ()=>cancelAnimationFrame(frame);
 },[phase,locked,match?.round]);

 if (DEDICATED_GAME_ROUTES.has(game)) return <main className="game-screen game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;

 useEffect(() => {
 if (!matchId || !match || match.status !== "finished" || stake <= 0 || !user?.uid) return;
 settleCasualCoinMatch(matchId, user.uid).catch((e) => {
 setError(e.message || "Coin settle nahi hua.");
 });
 }, [matchId, match?.status, stake, user?.uid]);

 async function startMatch() {
 setError(""); setBusy(true);
 try {
 const lobbyKey = `${game}-${stake}`;
 const id = await quickMatchCasual({
 gameId:lobbyKey, uid:user.uid, name:profile?.displayName || "Player",
 initialState:{
 baseGame:game, stakeCoins:stake, round:0,
 scores:{[user.uid]:0}, roundLocked:{},
 turnUid:user.uid, gameState:{}
 }
 });
 setMatchId(id); setPhase("searching");
 } catch(e) { setError(e.message || "Match nahi bana."); }
 finally { setBusy(false); }
 }

 async function cancel() {
 setBusy(true);
 try {
 await cancelCasualMatch(matchId, `${game}-${stake}`);
 setMatchId(null); setMatch(null); setPhase("setup");
 } catch(e) { setError(e.message || "Cancel failed."); }
 finally { setBusy(false); }
 }

 async function playRound() {
 if (locked || !match) return;
 setLocked(true);
 const base = Math.max(0, Math.round(100 - Math.abs(50-meter)*2));
 const bonus = choice ? 10 : 0;
 const score = Math.min(100, base+bonus);
 const mine = {...(match.roundLocked||{}),[user.uid]:score};
 const both = (match.playerUids||[]).every(uid=>mine[uid] !== undefined);
 const patch = {[`roundLocked.${user.uid}`]:score};
 if (both) {
 const next=(match.round||0)+1;
 const opp=(match.playerUids||[]).find(uid=>uid!==user.uid);
 const myTotal=(match.scores?.[user.uid]||0)+score;
 const oppTotal=(match.scores?.[opp]||0)+(mine[opp]||0);
 patch[`scores.${user.uid}`]=myTotal;
 if(next>=ROUNDS){
 patch.status="finished";
 patch.winner=myTotal===oppTotal?null:(myTotal>oppTotal?user.uid:opp);
 } else {
 patch.round=next; patch.roundLocked={};
 }
 }
 try { await updateCasualMatch(matchId,patch); }
 catch(e) { setError(e.message || "Score save nahi hua."); setLocked(false); }
 }

 if (phase==="setup") return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div><h1 className="font-display text-xl font-bold">{rule.icon} {rule.title}</h1><p className="text-sm text-mist">{rule.subtitle}</p></div>
 </header>
 <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
 <div className="text-center"><div className="text-6xl">{rule.icon}</div><h2 className="mt-3 text-lg font-bold">Choose Match</h2><p className="mt-1 text-xs text-mist">{rule.hint}</p></div>
 <div className="mt-5">
 <p className="mb-2 text-xs font-semibold text-mist">Match type</p>
 <div className="grid grid-cols-2 gap-2">
 <button onClick={()=>setStake(0)} className={`rounded-xl py-3 text-sm font-bold ${stake===0?"bg-gradient-to-r from-teal-400 to-yellow-300 text-black":"bg-white/10"}`}>🆓 Free Match</button>
 <button onClick={()=>setStake(stake===0?STAKES[1]:stake)} className={`rounded-xl py-3 text-sm font-bold ${stake>0?"bg-gradient-to-r from-yellow-300 to-orange-400 text-black":"bg-white/10"}`}>🪙 Coin Match</button>
 </div>
 </div>
 {stake>0 && <div className="mt-4"><p className="mb-2 text-xs font-semibold text-mist">Entry coins</p><div className="grid grid-cols-4 gap-2">{STAKES.slice(1).map(v=><button key={v} onClick={()=>setStake(v)} className={`rounded-xl py-2 text-xs font-bold ${stake===v?"bg-yellow-300 text-black":"bg-white/10"}`}>🪙 {v}</button>)}</div><p className="mt-2 text-[10px] text-mist">Coin entry selected: {stake}. Winner ko opponent ke entry coins milenge.</p></div>}
 <button disabled={busy} onClick={startMatch} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60">{busy?"Finding…":`⚡ ${stake>0?"Start Coin Match":"Quick Match"}`}</button>
 {error&&<p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
 </section>
 </main>
 );

 if (phase==="searching") return (
 <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5">
 <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
 <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl">{rule.icon}</div>
 <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
 <p className="mt-2 text-xs text-mist">{stake>0?`🪙 ${stake} coin match`:"Free match"} • {rule.title}</p>
 <button disabled={busy} onClick={cancel} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">{busy?"Cancelling…":"Cancel"}</button>
 {error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
 </div>
 </main>
 );

 if (phase==="playing") {
 const opponent=match.players?.find(p=>p.uid!==user.uid);
 const mine=match.scores?.[user.uid]||0;
 const theirs=match.scores?.[opponent?.uid]||0;
 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center justify-between px-4 pt-6 pb-3"><Link href="/games" className="text-2xl text-mist">‹</Link><p className="text-sm font-semibold">Round {(match.round||0)+1}/{ROUNDS}</p><span className="text-xs text-mist">You {mine} — {theirs} {opponent?.name||"…"}</span></header>
 <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
 <div className="flex items-center justify-between"><span className="text-xs text-mist">{rule.title}</span><span className="rounded-full bg-yellow-300/10 px-2 py-1 text-[10px] text-yellow-200">{stake>0?`🪙 ${stake}`:"FREE"}</span></div>
 <div className="mt-5 rounded-3xl bg-panel2 p-6 text-center">
 <div className="text-7xl">{rule.icon}</div>
 <h2 className="mt-3 text-xl font-bold">{rule.action}</h2>
 <p className="mt-1 text-xs text-mist">{rule.hint}</p>
 <div className="mt-6 flex items-center justify-center gap-3">
 {items.slice(0, Math.min(items.length,4)).map((x,i)=><button key={i} onClick={()=>setChoice(i)} className={`rounded-xl bg-white/10 px-3 py-3 text-lg ${choice===i?"ring-2 ring-yellow-300":""}`}>{x}</button>)}
 </div>
 <div className="relative mt-7 h-5 rounded-full bg-black/30">
 <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-emerald-400/70"/>
 <div className="absolute top-1/2 h-7 w-2 -translate-y-1/2 rounded-full bg-yellow-300 shadow-glow" style={{left:`${meter}%`,transform:"translate(-50%,-50%)"}}/>
 </div>
 <button disabled={locked} onClick={playRound} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60">{locked?"Waiting for opponent…":`🎯 ${rule.action}`}</button>
 </div>
 </section>
 {error&&<p className="mx-4 mt-3 text-sm text-red-300">{error}</p>}
 </main>
 );
 }

 if (phase==="finished") {
 const opponent=match.players?.find(p=>p.uid!==user.uid);
 const mine=match.scores?.[user.uid]||0, theirs=match.scores?.[opponent?.uid]||0;
 const won=match.winner===user.uid, draw=!match.winner;
 return <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5"><div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10"><div className="text-6xl">{draw?"🤝":won?"🏆":"😔"}</div><h1 className="mt-4 text-2xl font-bold">{draw?"Draw":won?"You Won!":"You Lost"}</h1><p className="mt-2 text-sm text-mist">{rule.title} • You {mine} — {theirs} {opponent?.name||""}</p>{stake>0&&<p className="mt-2 text-xs text-yellow-200">🪙 Coin Match: {stake} entry selected</p>}<button onClick={()=>{setMatchId(null);setMatch(null);setPhase("setup");}} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">Play Again</button></div></main>;
 }
 return null;
}
