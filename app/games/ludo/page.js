"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
 quickMatchCasual,
 listenCasualMatch,
 updateCasualMatch,
 cancelCasualMatch,
 settleCasualCoinMatch,
} from "@/lib/casualMatches";

const STAKES = [200000, 500000, 1000000, 2000000, 5000000];

const COLORS = {
 red: "#ef3038",
 blue: "#188be8",
 yellow: "#ffb914",
 green: "#21bf32",
};

const ORDER = ["red", "blue", "yellow", "green"];

const START = {
 red: 0,
 blue: 13,
 yellow: 26,
 green: 39,
};

const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const FINISH = 57;

const HOME_SLOTS = {
 red: [[1.5, 1.5], [1.5, 4.5], [4.5, 1.5], [4.5, 4.5]],
 blue: [[1.5, 10.5], [1.5, 13.5], [4.5, 10.5], [4.5, 13.5]],
 green: [[10.5, 1.5], [10.5, 4.5], [13.5, 1.5], [13.5, 4.5]],
 yellow: [[10.5, 10.5], [10.5, 13.5], [13.5, 10.5], [13.5, 13.5]],
};

const UNIQUE_TRACK = [
 [6,1],[6,2],[6,3],[6,4],[6,5],
 [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
 [1,8],[2,8],[3,8],[4,8],[5,8],
 [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
 [7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
 [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
 [13,6],[12,6],[11,6],[10,6],[9,6],
 [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],
];
function emptyTokens() {
 return {
 red: [-1, -1, -1, -1],
 blue: [-1, -1, -1, -1],
 yellow: [-1, -1, -1, -1],
 green: [-1, -1, -1, -1],
 };
}

function newLocalPlayers(count) {
 return ORDER.slice(0, count).map((color, i) => ({
 uid: `local-${color}`,
 name: `${color[0].toUpperCase()}${color.slice(1)} Player`,
 color,
 }));
}

function diceRoll() {
 return Math.floor(Math.random() * 6) + 1;
}

function canMove(position, dice) {
 if (position === FINISH) return false;
 if (position === -1) return dice === 6;
 return position + dice <= FINISH;
}

function globalCell(color, position) {
 if (position < 0 || position >= 52) return null;
 return (START[color] + position) % 52;
}

function tokenCoord(color, position) {
 if (position < 0) return null;

 if (position < 52) {
 const p = UNIQUE_TRACK[globalCell(color, position) % UNIQUE_TRACK.length];
 return [p[0] + 0.5, p[1] + 0.5];
 }

 const homePath = {
 red: [[7.5, 1.5], [7.5, 2.5], [7.5, 3.5], [7.5, 4.5], [7.5, 5.5], [7.5, 6.5]],
 blue: [[1.5, 7.5], [2.5, 7.5], [3.5, 7.5], [4.5, 7.5], [5.5, 7.5], [6.5, 7.5]],
 yellow: [[7.5, 13.5], [7.5, 12.5], [7.5, 11.5], [7.5, 10.5], [7.5, 9.5], [7.5, 8.5]],
 green: [[13.5, 7.5], [12.5, 7.5], [11.5, 7.5], [10.5, 7.5], [9.5, 7.5], [8.5, 7.5]],
 };
 if (position >= 52 && position < 58) return homePath[color][position - 52];
 return [7.5, 7.5];
}

function initialState(players, stake = 0, mode = "local") {
 return {
 mode,
 stakeCoins: stake,
 playerCount: players.length,
 players,
 tokens: emptyTokens(),
 turnIndex: 0,
 dice: 1,
 lastRoll: 1,
 status: "playing",
 winner: null,
 pot: stake * players.length,
 };
}

export default function LudoPage() {
 const { user, profile, loading } = useAuth();

 const [mode, setMode] = useState("local");
 const [playerCount, setPlayerCount] = useState(2);
 const [stake, setStake] = useState(1000);
 const [phase, setPhase] = useState("setup");
 const [state, setState] = useState(null);
 const [matchId, setMatchId] = useState(null);
 const [rolling, setRolling] = useState(false);
 const [message, setMessage] = useState("");
 const [error, setError] = useState("");
 const [chatOpen, setChatOpen] = useState(false);
 const [chatText, setChatText] = useState("");
 const [chatMessages, setChatMessages] = useState([]);

 const online = mode === "online";

 useEffect(() => {
 if (!matchId) return;
 return listenCasualMatch(
 matchId,
 (next) => {
 if (!next) return;
 const players = (next.players || []).map((p, i) => ({
 ...p,
 color: p.color || ORDER[i] || "red",
 }));
 setState({ ...next, players });
 if (next.status === "waiting") setPhase("searching");
 if (next.status === "playing") setPhase("game");
 if (next.status === "finished") setPhase("finished");
 },
 (e) => setError(e.message || "Match sync error.")
 );
 }, [matchId]);

 useEffect(() => {
 if (
 !matchId ||
 !state ||
 state.status !== "finished" ||
 !online ||
 !user?.uid ||
 !state.stakeCoins
 ) return;
 settleCasualCoinMatch(matchId, user.uid).catch((e) =>
 setError(e.message || "Coin settlement failed.")
 );
 }, [matchId, state?.status, online, user?.uid, state?.stakeCoins]);

 const me = user?.uid || "local-red";
 const currentPlayer = state?.players?.[state?.turnIndex] || null;
 const myTurn = state?.mode === "local"
 ? true
 : currentPlayer?.uid === me;

 const winnerName = useMemo(() => {
 if (!state?.winner) return "";
 return state.players?.find((p) => p.uid === state.winner)?.name || "Winner";
 }, [state]);

 if (loading && online) {
 return <main className="min-h-screen bg-[#090b12] text-white flex items-center justify-center">Loading…</main>;
 }

 function startLocal() {
 const players = newLocalPlayers(playerCount);
 setState(initialState(players, 0, "local"));
 setPhase("game");
 setMessage("Local game started. Red Player ki turn hai.");
 setError("");
 }

 async function startOnline() {
 if (!user) {
 setError("Online match ke liye login zaroori hai.");
 return;
 }
 if (Number(profile?.coins || 0) < stake) {
 setError("Aap ke paas entry ke liye enough Coins nahi hain.");
 return;
 }

 setError("");
 try {
 const id = await quickMatchCasual({
 gameId: `ludo-${stake}`,
 uid: user.uid,
 name: profile?.displayName || "Player",
 initialState: {
 mode: "online",
 stakeCoins: stake,
 playerCount: 2,
 players: [{ uid: user.uid, name: profile?.displayName || "Player", color: "red" }],
 tokens: emptyTokens(),
 turnIndex: 0,
 dice: 1,
 lastRoll: 1,
 status: "waiting",
 winner: null,
 pot: stake * 2,
 },
 });
 setMatchId(id);
 setPhase("searching");
 setMessage("");
 } catch (e) {
 setError(e.message || "Quick Match start nahi hua.");
 }
 }

 async function cancelSearch() {
 if (!matchId) return;
 try {
 await cancelCasualMatch(matchId, `ludo-${stake}`);
 } catch {}
 setMatchId(null);
 setState(null);
 setPhase("setup");
 }

 function startRoomLikeLocal() {
 // Room UI is intentionally kept local-safe until a dedicated 4-player
 // Ludo backend is installed. It creates a shareable local session code.
 const code = Math.random().toString(36).slice(2, 8).toUpperCase();
 const players = newLocalPlayers(playerCount);
 setState({
 ...initialState(players, 0, "local-room"),
 roomCode: code,
 });
 setPhase("game");
 setMessage(`Room ${code} created. Local pass-and-play mode.`);
 }

 function roll() {
 if (!state || rolling || !myTurn || state.status !== "playing") return;

 setRolling(true);
 let n = 0;
 const timer = setInterval(() => {
 setState((s) => s ? ({ ...s, lastRoll: diceRoll() }) : s);
 n++;
 if (n >= 7) {
 clearInterval(timer);
 const result = diceRoll();
 setState((s) => s ? ({ ...s, dice: result, lastRoll: result }) : s);
 setRolling(false);
 setMessage(`Dice: ${result}. Move a token.`);
 }
 }, 75);
 }

 async function moveToken(color, index) {
 if (!state || state.status !== "playing" || !myTurn) return;

 const dice = state.dice || state.lastRoll || 1;
 const current = state.tokens?.[color]?.[index] ?? -1;

 if (!canMove(current, dice)) {
 setMessage(dice === 6 ? "Ye token move nahi ho sakta." : "Is token ko is roll par move nahi kar sakte.");
 return;
 }

 const next = current === -1 ? 0 : current + dice;
 const tokens = {
 ...state.tokens,
 [color]: [...state.tokens[color]],
 };
 tokens[color][index] = next;

 // Cut opponent tokens unless the destination is safe.
 const landing = globalCell(color, next);
 if (landing !== null && !SAFE.has(landing)) {
 for (const other of ORDER.slice(0, state.playerCount)) {
 if (other === color) continue;
 tokens[other] = tokens[other].map((p) =>
 globalCell(other, p) === landing ? -1 : p
 );
 }
 }

 const won = tokens[color].every((p) => p === FINISH);

 const updated = {
 ...state,
 tokens,
 dice: 1,
 lastRoll: dice,
 status: won ? "finished" : "playing",
 winner: won ? state.players?.find((p) => p.color === color)?.uid : null,
 turnIndex: dice === 6 && !won
 ? state.turnIndex
 : (state.turnIndex + 1) % state.playerCount,
 };

 setState(updated);

 if (won) {
 setPhase("finished");
 setMessage(`${color.toUpperCase()} player won!`);
 if (online && matchId) {
 try {
 await updateCasualMatch(matchId, updated);
 } catch (e) {
 setError(e.message || "Winner save nahi hua.");
 }
 }
 return;
 }

 if (dice === 6) {
 setMessage("6! Dobara roll karein.");
 } else {
 const nextPlayer = updated.players[updated.turnIndex];
 setMessage(`${nextPlayer.name} ki turn.`);
 }

 if (online && matchId) {
 try {
 await updateCasualMatch(matchId, updated);
 } catch (e) {
 setError(e.message || "Move sync nahi hua.");
 }
 }
 }

 function sendChatMessage() {
 const text = chatText.trim();
 if (!text) return;
 const sender =
 currentPlayer?.name ||
 profile?.displayName ||
 (state?.mode === "local" ? "Local Player" : "Player");

 setChatMessages((items) => [
 ...items,
 { id: Date.now(), sender, text }
 ]);
 setChatText("");
 }

 function reset() {
 setPhase("setup");
 setState(null);
 setMatchId(null);
 setMessage("");
 setError("");
 }

 if (phase === "setup") {
 return (
 <main className="min-h-screen bg-[#090b12] text-white pb-10">
 <header className="mx-auto max-w-xl px-4 pt-6">
 <div className="flex items-center gap-3">
 <Link href="/games" className="text-2xl text-white/60">‹</Link>
 <div>
 <h1 className="text-2xl font-black">Ludo</h1>
 <p className="text-xs text-white/50">Real board • Local 2/4 • Online Coins</p>
 </div>
 </div>
 </header>

 <section className="mx-auto mt-5 max-w-xl px-4">
 <div className="rounded-3xl bg-[#141824] p-5 ring-1 ring-white/10">
 <div className="mb-5 rounded-2xl bg-gradient-to-br from-red-500/30 via-blue-500/20 to-yellow-400/30 p-6 text-center">
 <div className="mx-auto grid w-28 grid-cols-2 gap-2 rounded-2xl bg-white/10 p-3">
 {ORDER.map((c) => (
 <span key={c} className="aspect-square rounded-full shadow-lg" style={{ background: COLORS[c] }} />
 ))}
 </div>
 <h2 className="mt-4 text-xl font-black">Classic Ludo</h2>
 </div>

 <p className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">Play Mode</p>
 <div className="grid grid-cols-2 gap-2">
 <button onClick={() => setMode("local")} className={`rounded-xl px-3 py-3 text-sm font-black ${!online ? "bg-white text-black" : "bg-white/10"}`}>
 📱 Local Play
 </button>
 <button onClick={() => setMode("online")} className={`rounded-xl px-3 py-3 text-sm font-black ${online ? "bg-white text-black" : "bg-white/10"}`}>
 🌐 Online Play
 </button>
 </div>

 <p className="mb-2 mt-5 text-xs font-black uppercase tracking-wider text-white/50">Players</p>
 <div className="grid grid-cols-2 gap-2">
 {[2, 4].map((n) => (
 <button key={n} onClick={() => setPlayerCount(n)} disabled={online && n === 4}
 className={`rounded-xl px-3 py-3 text-sm font-black ${playerCount === n ? "bg-gradient-to-r from-yellow-300 to-orange-400 text-black" : "bg-white/10"} disabled:cursor-not-allowed disabled:opacity-40`}>
 {n} Players
 {online && n === 4 ? " (coming soon)" : ""}
 </button>
 ))}
 </div>

 {online && (
 <>
 <p className="mb-2 mt-5 text-xs font-black uppercase tracking-wider text-white/50">Entry Coins</p>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
 {STAKES.map((v) => (
 <button key={v} onClick={() => setStake(v)}
 className={`rounded-xl px-3 py-3 text-sm font-black ${stake === v ? "bg-yellow-300 text-black" : "bg-white/10"}`}>
 🪙 {v.toLocaleString()}
 </button>
 ))}
 </div>
 <div className="mt-3 flex justify-between rounded-xl bg-black/20 px-4 py-3 text-xs">
 <span>Your Coins</span>
 <b>🪙 {Number(profile?.coins || 0).toLocaleString()}</b>
 </div>
 </>
 )}

 <div className="mt-5 grid gap-2">
 <button onClick={online ? startOnline : startLocal}
 className="rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-black text-black">
 {online ? "⚡ QUICK MATCH" : "▶ PLAY LOCAL"}
 </button>
 {!online && (
 <button onClick={startRoomLikeLocal} className="rounded-full bg-white/10 py-4 font-black">
 CREATE LOCAL ROOM
 </button>
 )}
 </div>

 {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-300">{error}</p>}

 <div className="mt-5 rounded-2xl bg-black/20 p-4 text-xs leading-5 text-white/60">
 <b className="text-white">Local:</b> ek device par 2 ya 4 players bari bari khel sakte hain.
 <br />
 <b className="text-white">Online:</b> 2-player virtual Coins match. Diamonds use nahi hote.
 </div>
 </div>
 </section>
 </main>
 );
 }

 if (phase === "searching") {
 return (
 <main className="min-h-screen bg-[#090b12] text-white flex items-center justify-center p-5">
 <div className="w-full max-w-sm rounded-3xl bg-[#141824] p-7 text-center ring-1 ring-white/10">
 <div className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-white/10 text-5xl">🎲</div>
 <h1 className="mt-6 text-2xl font-black">Finding Player…</h1>
 <p className="mt-2 text-sm text-white/50">Online Ludo opponent search ho raha hai.</p>
 <button onClick={cancelSearch} className="mt-6 w-full rounded-full bg-white/10 py-3 font-bold">CANCEL</button>
 </div>
 </main>
 );
 }

 if (phase === "finished" && state) {
 return (
 <main className="min-h-screen bg-[#090b12] text-white flex items-center justify-center p-5">
 <div className="w-full max-w-sm rounded-3xl bg-[#141824] p-8 text-center ring-1 ring-white/10">
 <div className="text-6xl">🏆</div>
 <h1 className="mt-4 text-3xl font-black">Winner!</h1>
 <div className="mx-auto mt-5 h-20 w-20 rounded-full shadow-xl" style={{ background: COLORS[state.players.find((p) => p.uid === state.winner)?.color || "red"] }} />
 <h2 className="mt-4 text-xl font-black">{winnerName}</h2>
 {online && <p className="mt-2 text-green-300">Virtual Coins settlement processed.</p>}
 <button onClick={reset} className="mt-7 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-4 font-black text-black">PLAY AGAIN</button>
 </div>
 </main>
 );
 }

 if (!state) return null;

 return (
 <main className="min-h-screen bg-[#090b12] text-white pb-8">
 <header className="mx-auto flex max-w-2xl items-center justify-between px-3 py-3">
 <button onClick={reset} className="rounded-xl bg-white/10 px-3 py-2 text-xl">‹</button>
 <div className="text-center">
 <b className="block">Milaap Ludo</b>
 <span className="text-[10px] text-white/50">
 {state.mode === "local-room" ? `Room ${state.roomCode}` : state.mode === "local" ? "LOCAL GAME" : "ONLINE • COINS"}
 </span>
 </div>
 <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black">
 {online ? `🪙 ${Number(profile?.coins || 0).toLocaleString()}` : "LOCAL"}
 </div>
 </header>

 <div className="mx-auto flex max-w-2xl justify-center gap-2 px-3 pb-3">
 {state.players.map((p, i) => (
 <div key={p.uid} className={`rounded-full px-3 py-2 text-[10px] font-black ring-1 ${i === state.turnIndex ? "bg-white text-black ring-white" : "bg-white/5 text-white/60 ring-white/10"}`}>
 <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: COLORS[p.color] }} />
 {p.name}
 </div>
 ))}
 </div>

 <section className="mx-auto w-[min(94vw,620px)]">
 <div className="rounded-2xl bg-[#141824] p-2 shadow-2xl ring-1 ring-white/10">
 <LudoBoard state={state} onToken={moveToken} />
 </div>
 </section>

 <section className="mx-auto mt-4 max-w-2xl px-4 text-center">
 <div className="min-h-6 text-xs font-bold text-white/70">{message}</div>
 <button disabled={!myTurn || rolling} onClick={roll}
 className={`mx-auto mt-2 grid h-20 w-20 place-items-center rounded-2xl bg-white p-2 shadow-2xl ${rolling ? "animate-spin" : ""}`}>
 <DiceFace n={state.dice || state.lastRoll || 1} />
 </button>
 <button disabled={!myTurn || rolling} onClick={roll}
 className="mt-3 rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 px-9 py-3 text-sm font-black text-black disabled:opacity-40">
 {rolling ? "ROLLING…" : "ROLL DICE"}
 </button>
 <p className="mt-3 text-[10px] text-white/40">6 = extra turn • ★ = safe cell • opponent token can be cut</p>

 <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
 <Link
 href="/profile"
 className="rounded-full bg-white/10 px-4 py-2 text-xs font-black"
 >
 💎 Profile Diamonds
 </Link>
 <button
 onClick={() => setChatOpen((v) => !v)}
 className="rounded-full bg-white/10 px-4 py-2 text-xs font-black"
 >
 💬 Chat {chatMessages.length ? `(${chatMessages.length})` : ""}
 </button>
 </div>

 {chatOpen && (
 <div className="mx-auto mt-3 max-w-md rounded-2xl bg-[#141824] p-3 text-left ring-1 ring-white/10">
 <div className="mb-2 flex items-center justify-between">
 <b className="text-sm">Match Chat</b>
 <button
 onClick={() => setChatOpen(false)}
 className="rounded-lg bg-white/10 px-2 py-1 text-xs"
 >
 ×
 </button>
 </div>

 <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl bg-black/20 p-2">
 {chatMessages.length === 0 ? (
 <p className="p-3 text-center text-xs text-white/40">
 Abhi koi message nahi.
 </p>
 ) : (
 chatMessages.map((m) => (
 <div key={m.id} className="rounded-xl bg-white/5 p-2">
 <p className="text-[10px] font-black text-white/50">{m.sender}</p>
 <p className="mt-1 break-words text-xs">{m.text}</p>
 </div>
 ))
 )}
 </div>

 <div className="mt-2 flex gap-2">
 <input
 value={chatText}
 onChange={(e) => setChatText(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") sendChatMessage();
 }}
 maxLength={200}
 placeholder="Message..."
 className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-xs outline-none"
 />
 <button
 onClick={sendChatMessage}
 className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black"
 >
 Send
 </button>
 </div>
 </div>
 )}
 </section>
 </main>
 );
}

function LudoBoard({ state, onToken }) {
 return (
 <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
 <div className="absolute left-0 top-0 h-[40%] w-[40%]" style={{ background: COLORS.red }}>
 <HomeTokens color="red" state={state} onToken={onToken} />
 </div>
 <div className="absolute right-0 top-0 h-[40%] w-[40%]" style={{ background: COLORS.blue }}>
 <HomeTokens color="blue" state={state} onToken={onToken} />
 </div>
 <div className="absolute bottom-0 left-0 h-[40%] w-[40%]" style={{ background: COLORS.green }}>
 <HomeTokens color="green" state={state} onToken={onToken} />
 </div>
 <div className="absolute bottom-0 right-0 h-[40%] w-[40%]" style={{ background: COLORS.yellow }}>
 <HomeTokens color="yellow" state={state} onToken={onToken} />
 </div>

 {UNIQUE_TRACK.map(([r, c], i) => (
 <div key={`cell-${i}`} className="absolute border border-black/25 bg-white"
 style={{ left: `${(c / 15) * 100}%`, top: `${(r / 15) * 100}%`, width: `${100 / 15}%`, height: `${100 / 15}%` }}>
 {SAFE.has(i) && <span className="grid h-full place-items-center text-[clamp(9px,2.7vw,22px)] text-gray-500">★</span>}
 </div>
 ))}

 <div className="absolute left-[40%] top-0 h-[40%] w-[20%]">
 <div className="grid h-full grid-cols-3 grid-rows-6">
 {Array.from({ length: 18 }).map((_, i) => (
 <div key={i} className={`border border-black/20 ${i >= 6 && i < 12 ? "bg-blue-400" : "bg-white"}`} />
 ))}
 </div>
 </div>

 <div className="absolute bottom-0 left-[40%] h-[40%] w-[20%]">
 <div className="grid h-full grid-cols-3 grid-rows-6">
 {Array.from({ length: 18 }).map((_, i) => (
 <div key={i} className={`border border-black/20 ${i >= 6 && i < 12 ? "bg-green-400" : "bg-white"}`} />
 ))}
 </div>
 </div>

 <div className="absolute left-0 top-[40%] h-[20%] w-[40%]">
 <div className="grid h-full grid-cols-6 grid-rows-3">
 {Array.from({ length: 18 }).map((_, i) => (
 <div key={i} className={`border border-black/20 ${i >= 6 && i < 12 ? "bg-red-400" : "bg-white"}`} />
 ))}
 </div>
 </div>

 <div className="absolute right-0 top-[40%] h-[20%] w-[40%]">
 <div className="grid h-full grid-cols-6 grid-rows-3">
 {Array.from({ length: 18 }).map((_, i) => (
 <div key={i} className={`border border-black/20 ${i >= 6 && i < 12 ? "bg-yellow-400" : "bg-white"}`} />
 ))}
 </div>
 </div>

 <div className="absolute left-[40%] top-[40%] h-[20%] w-[20%] overflow-hidden">
 <div className="absolute inset-0 bg-red-500" style={{ clipPath: "polygon(0 0, 50% 50%, 0 100%)" }} />
 <div className="absolute inset-0 bg-blue-500" style={{ clipPath: "polygon(0 0, 100% 0, 50% 50%)" }} />
 <div className="absolute inset-0 bg-yellow-400" style={{ clipPath: "polygon(100% 0, 100% 100%, 50% 50%)" }} />
 <div className="absolute inset-0 bg-green-500" style={{ clipPath: "polygon(0 100%, 100% 100%, 50% 50%)" }} />
 </div>

 {ORDER.slice(0, state.playerCount).map((color) =>
 state.tokens[color].map((position, index) => {
 const coord = tokenCoord(color, position);
 if (!coord) return null;
 return (
 <button key={`${color}-${index}`} onClick={() => onToken(color, index)}
 className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_3px_7px_rgba(0,0,0,.35)]"
 style={{
 left: `${(coord[1] / 15) * 100}%`,
 top: `${(coord[0] / 15) * 100}%`,
 width: "6.5%",
 aspectRatio: "1",
 background: COLORS[color],
 }}
 aria-label={`${color} token ${index + 1}`}
 />
 );
 })
 )}
 </div>
 );
}

function HomeTokens({ color, state, onToken }) {
 return (
 <>
 {state.tokens[color].map((position, i) => {
 if (position >= 0) return null;
 const [r, c] = HOME_SLOTS[color][i];
 return (
 <button key={i} onClick={() => onToken(color, i)}
 className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
 style={{
 left: `${(c / 6) * 100}%`,
 top: `${(r / 6) * 100}%`,
 width: "20%",
 aspectRatio: "1",
 background: COLORS[color],
 }}
 />
 );
 })}
 </>
 );
}

function DiceFace({ n }) {
 const positions = {
 1: [5],
 2: [1, 9],
 3: [1, 5, 9],
 4: [1, 3, 7, 9],
 5: [1, 3, 5, 7, 9],
 6: [1, 3, 4, 6, 7, 9],
 };
 return (
 <div className="grid h-full w-full grid-cols-3 grid-rows-3">
 {Array.from({ length: 9 }).map((_, i) => (
 <span key={i} className={positions[n]?.includes(i + 1) ? "m-auto h-2.5 w-2.5 rounded-full bg-black" : ""} />
 ))}
 </div>
 );
}
