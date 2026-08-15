"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// CrazyGems — free-play memory match. , NO wagering.
// Flip cards to find matching gem pairs in as few moves as possible.

const GEMS = ["💎", "🔮", "💍", "🟣", "🔷", "🟢", "🟡", "🔴"];

function shuffledDeck() {
 const pairs = [...GEMS, ...GEMS];
 for (let i = pairs.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
 }
 return pairs.map((gem, i) => ({ id: i, gem, flipped: false, matched: false }));
}

export default function CrazyGemsPage() {
 const { user, profile, loading } = useAuth();
 const [stake, setStake] = useState(0);
 const [sessionId, setSessionId] = useState(null);
 const [walletBusy, setWalletBusy] = useState(false);
 const [phase, setPhase] = useState("setup"); // setup | playing | finished
 const [cards, setCards] = useState([]);
 const [selected, setSelected] = useState([]);
 const [moves, setMoves] = useState(0);
 const [bestMoves, setBestMoves] = useState(null);
 const [seconds, setSeconds] = useState(0);
 const timerRef = useRef(null);
 const lockRef = useRef(false);

 useEffect(() => () => clearInterval(timerRef.current), []);


 useEffect(() => {
 if (phase !== "finished" || !sessionId) return;
 const reward = scoreToReward(Math.max(0, 1000 - moves * 25), { entryCoins: stake, multiplier: 1 });
 settleGameSession({ sessionId, uid: user.uid, gameId: "crazygems", score: Math.max(0, 1000 - moves * 25), rewardCoins: reward, outcome: "finished" }).catch(() => {});
 }, [phase, sessionId]);

 if (loading || !user) {
 return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
 }

 async function startRound() {
 if (walletBusy) return;
 setWalletBusy(true);
 let sid;
 try { sid = await beginGameSession({ uid: user.uid, gameId: "crazygems", entryCoins: stake }); setSessionId(sid); }
 catch (e) { alert(e.message || "Unable to start game"); return; }
 finally { setWalletBusy(false); }
 setCards(shuffledDeck());
 setSelected([]);
 setMoves(0);
 setSeconds(0);
 setPhase("playing");
 clearInterval(timerRef.current);
 timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
 }

 function flipCard(id) {
 if (lockRef.current || phase !== "playing") return;
 const card = cards.find((c) => c.id === id);
 if (!card || card.flipped || card.matched) return;

 const newCards = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
 const newSelected = [...selected, id];
 setCards(newCards);
 setSelected(newSelected);

 if (newSelected.length === 2) {
 lockRef.current = true;
 setMoves((m) => m + 1);
 const [a, b] = newSelected;
 const cardA = newCards.find((c) => c.id === a);
 const cardB = newCards.find((c) => c.id === b);

 setTimeout(() => {
 setCards((prev) => {
 const isMatch = cardA.gem === cardB.gem;
 const updated = prev.map((c) => {
 if (c.id === a || c.id === b) {
 return isMatch ? { ...c, matched: true } : { ...c, flipped: false };
 }
 return c;
 });
 if (updated.every((c) => c.matched)) {
 clearInterval(timerRef.current);
 setPhase("finished");
 setBestMoves((prevBest) => (prevBest === null ? moves + 1 : Math.min(prevBest, moves + 1)));
 }
 return updated;
 });
 setSelected([]);
 lockRef.current = false;
 }, 650);
 }
 }

 if (phase === "setup") {
 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div>
 <h1 className="font-display text-xl font-bold">💎 CrazyGems</h1>
 <p className="text-sm text-mist">Skill memory game • virtual coins</p>
 </div>
 </header>
 <section className="mx-4 rounded-3xl bg-panel p-5 text-center ring-1 ring-white/10">
 <div className="text-6xl">💎🔮💍</div>
 <h2 className="mt-3 text-lg font-bold">Find every matching pair!</h2>
 <p className="mt-2 text-sm text-mist">
 Flip two cards at a time. Match all 8 gem pairs in the fewest moves and the least
 time possible.
 </p>
 <span className="mt-3 inline-block rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
 <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />
 <button onClick={startRound} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black">
 ▶️ Start Round
 </button>
 <p className="mt-4 text-[10px] leading-4 text-mist/70">
 CrazyGems is an entertainment-only mini-game. It uses Milaap . wagering or cash-out is added.
 </p>
 </section>
 </main>
 );
 }

 if (phase === "playing") {
 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center justify-between px-4 pt-6 pb-3">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <p className="text-sm font-semibold">⏱ {seconds}s</p>
 <span className="text-xs text-mist">Moves {moves}</span>
 </header>
 <section className="mx-4 rounded-3xl bg-panel p-4 ring-1 ring-white/10">
 <div className="grid grid-cols-4 gap-2">
 {cards.map((c) => (
 <button
 key={c.id}
 onClick={() => flipCard(c.id)}
 className={`flex h-16 items-center justify-center rounded-xl text-3xl ring-1 ring-white/10 transition ${
 c.matched ? "bg-emerald-500/30" : c.flipped ? "bg-panel2" : "bg-white/10"
 }`}
 >
 {c.flipped || c.matched ? c.gem : "❔"}
 </button>
 ))}
 </div>
 </section>
 </main>
 );
 }

 return (
 <main className="game-screen min-h-screen bg-void text-ink flex items-center justify-center px-5">
 <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
 <div className="text-6xl">🏆</div>
 <h1 className="mt-4 text-2xl font-bold">All Matched!</h1>
 <p className="mt-2 text-sm text-mist">Moves: {moves} • Time: {seconds}s • Best moves: {bestMoves}</p>
 <button onClick={startRound} className="mt-6 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">
 Play Again
 </button>
 <Link href="/games" className="mt-3 block w-full rounded-full bg-white/10 py-3 text-sm font-semibold">
 Back to Games
 </Link>
 </div>
 </main>
 );
}
