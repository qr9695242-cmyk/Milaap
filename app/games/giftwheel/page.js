"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import GameWalletControls from "@/components/GameWalletControls";
import { beginGameSession, settleGameSession, scoreToReward } from "@/lib/gameEconomy";

// GiftWheel — virtual-coin spin game. wagering or cash-out.

const SEGMENTS = [
 { label: "🌹 Rose", color: "#F472B6" },
 { label: "⭐ Star", color: "#FACC15" },
 { label: "💎 Gem", color: "#38BDF8" },
 { label: "🎉 Party", color: "#A78BFA" },
 { label: "🍀 Lucky", color: "#4ADE80" },
 { label: "👑 Crown", color: "#FB923C" },
 { label: "🎁 Gift", color: "#F87171" },
 { label: "✨ Sparkle", color: "#2DD4BF" },
];

const SEG_ANGLE = 360 / SEGMENTS.length;

export default function GiftWheelPage() {
 const { user, profile, loading } = useAuth();
 const [stake, setStake] = useState(0);
 const [sessionId, setSessionId] = useState(null);
 const [walletBusy, setWalletBusy] = useState(false);
 const [rotation, setRotation] = useState(0);
 const [spinning, setSpinning] = useState(false);
 const [result, setResult] = useState(null);
 const [spinCount, setSpinCount] = useState(0);
 const [history, setHistory] = useState([]);
 const wheelRef = useRef(null);

 useEffect(() => {
 if (!sessionId) return;
 const scoreValue = result ? (SEGMENTS.indexOf(result) + 1) * 25 : 0;
 const reward = scoreToReward(scoreValue, { entryCoins: stake, multiplier: 1 });
 // Action games settle after their visible result is produced.
 if ((result != null)) { settleGameSession({ sessionId, uid: user.uid, gameId: "wheel", score: scoreValue, rewardCoins: reward, outcome: "finished" }).catch(() => {}); setSessionId(null); }
 }, [spinCount, sessionId]);

 if (loading || !user) {
 return <main className="game-screen min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
 }

 async function spin() {
 if (walletBusy) return;
 setWalletBusy(true);
 let sid;
 try { sid = await beginGameSession({ uid: user.uid, gameId: "wheel", entryCoins: stake }); setSessionId(sid); }
 catch (e) { alert(e.message || "Unable to start game"); return; }
 finally { setWalletBusy(false); }

 if (spinning) return;
 setSpinning(true);
 setResult(null);

 const winnerIndex = Math.floor(Math.random() * SEGMENTS.length);
 // Land the pointer (fixed at top, 0deg) on the middle of the winning segment.
 const targetAngle = 360 - (winnerIndex * SEG_ANGLE + SEG_ANGLE / 2);
 const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
 const finalRotation = rotation + extraSpins * 360 + ((targetAngle - (rotation % 360) + 360) % 360);

 setRotation(finalRotation);
 setTimeout(() => {
 const winner = SEGMENTS[winnerIndex];
 setResult(winner);
 setSpinCount((c) => c + 1);
 setHistory((h) => [winner.label, ...h].slice(0, 6));
 setSpinning(false);
 }, 3200);
 }

 return (
 <main className="game-screen min-h-screen bg-void text-ink pb-10">
 <header className="flex items-center gap-3 px-4 pt-6 pb-4">
 <Link href="/games" className="text-2xl text-mist">‹</Link>
 <div>
 <h1 className="font-display text-xl font-bold">🎡 GiftWheel</h1>
 <p className="text-sm text-mist">Free play spin • virtual coins</p>
 </div>
 </header>

 <section className="mx-4 rounded-3xl bg-panel p-5 ring-1 ring-white/10">
 <div className="flex items-center justify-center gap-2">
 <span className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-black text-ink">VIRTUAL COINS</span>
 <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-mist"></span>
 </div>

 <div className="relative mx-auto mt-6 h-64 w-64">
 <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 text-3xl">🔻</div>
 <div
 ref={wheelRef}
 className="h-64 w-64 rounded-full ring-4 ring-white/10"
 style={{
 transform: `rotate(${rotation}deg)`,
 transition: spinning ? "transform 3.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
 background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`).join(",")})`,
 }}
 >
 {SEGMENTS.map((s, i) => (
 <div
 key={i}
 className="absolute left-1/2 top-1/2 h-1/2 origin-top text-center text-[11px] font-bold text-black/80"
 style={{ transform: `rotate(${i * SEG_ANGLE + SEG_ANGLE / 2}deg)` }}
 >
 <span className="mt-3 inline-block -rotate-90">{s.label}</span>
 </div>
 ))}
 </div>
 <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-void ring-2 ring-white/20" />
 </div>

 {result && (
 <p className="mt-4 text-center text-lg font-bold text-yellow-200">
 You landed on {result.label}!
 </p>
 )}

 <div className="mt-4 grid grid-cols-2 gap-2 text-center">
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Spins</p>
 <p className="text-sm font-bold text-ink">{spinCount}</p>
 </div>
 <div className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] text-mist">Last Result</p>
 <p className="text-sm font-bold text-ink">{result ? result.label : "—"}</p>
 </div>
 </div>

 {history.length > 0 && (
 <div className="mt-3 flex flex-wrap justify-center gap-1.5">
 {history.map((h, i) => (
 <span key={i} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-mist">{h}</span>
 ))}
 </div>
 )}

 <GameWalletControls profile={profile} stake={stake} setStake={setStake} busy={walletBusy} />

 <button
 disabled={spinning}
 onClick={spin}
 className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-bold text-black disabled:opacity-60"
 >
 {spinning ? "Spinning…" : "🎡 Spin (Free)"}
 </button>

 <p className="mt-4 text-center text-[10px] leading-4 text-mist/70">
 GiftWheel is an entertainment-only mini-game. It does not use real money, does not
 debit or credit your wallet, and cannot be cashed out.
 </p>
 </section>
 </main>
 );
}
