"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const WORDS = [
  "MOBILE", "GAMES", "COINS", "MATCH", "PLAYER", "WINNER", "STREAM",
  "FRIEND", "PROFILE", "REWARD", "SIGNAL", "CAMERA", "MUSIC", "PARTY",
  "LEVEL", "SEASON", "TICKET", "SCREEN",
];
const ROUNDS = 5;

function shuffleWord(word) {
  let letters;
  do { letters = word.split("").sort(() => Math.random() - 0.5); }
  while (letters.join("") === word);
  return letters.join("");
}

function pickRounds() {
  const words = [...WORDS].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
  return words.map((w) => ({ answer: w, scrambled: shuffleWord(w) }));
}

export default function WordBattlePage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [wrongShake, setWrongShake] = useState(false);

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

  useEffect(() => { setInput(""); }, [match?.round]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const id = await quickMatchCasual({
        gameId: "word",
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: { rounds: pickRounds(), round: 0, scores: { [user.uid]: 0 } },
      });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId, "word"); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!match || match.status !== "playing") return;
    if (match.scores?.[match.players?.[1]?.uid] !== undefined) return;
    if (match.hostUid === user.uid) return;
    updateCasualMatch(matchId, { [`scores.${user.uid}`]: 0 }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status]);

  async function submit() {
    if (!match || !input.trim()) return;
    const round = match.rounds[match.round];
    const guess = input.trim().toUpperCase();
    if (guess !== round.answer) {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 400);
      return;
    }
    setInput("");
    const nextRound = match.round + 1;
    const patch = { [`scores.${user.uid}`]: (match.scores?.[user.uid] || 0) + 1 };
    if (nextRound >= match.rounds.length) {
      const scores = { ...match.scores, [user.uid]: (match.scores?.[user.uid] || 0) + 1 };
      const [a, b] = match.playerUids;
      patch.status = "finished";
      patch.winner = (scores[a] || 0) === (scores[b] || 0) ? null : (scores[a] || 0) > (scores[b] || 0) ? a : b;
    } else {
      patch.round = nextRound;
    }
    try { await updateCasualMatch(matchId, patch); }
    catch (e) { setError(e.message || "Score save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">Word Battle</h1>
            <p className="text-sm text-mist">Live 1v1 unscramble race • {ROUNDS} words • free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🔤</div>
          <h1 className="mt-6 font-display text-2xl font-bold">Finding opponent…</h1>
          <button disabled={busy} onClick={cancel} className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">
            {busy ? "Cancelling…" : "Cancel"}
          </button>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      </main>
    );
  }

  if (phase === "playing") {
    const round = match.rounds[match.round];
    const opponent = match.players?.find((p) => p.uid !== user.uid);
    const myScore = match.scores?.[user.uid] || 0;
    const theirScore = match.scores?.[opponent?.uid] || 0;

    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">Word {match.round + 1}/{match.rounds.length}</p>
          <span className="text-xs text-mist">You {myScore} — {theirScore} {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 mt-4 rounded-2xl bg-panel p-6 text-center ring-1 ring-white/10">
          <p className={`font-display text-3xl font-black tracking-[0.3em] ${wrongShake ? "text-red-400" : "text-ink"}`}>
            {round.scrambled}
          </p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
            maxLength={round.answer.length}
            placeholder="Type the word"
            className="mt-6 w-full rounded-xl bg-panel2 px-4 py-3 text-center text-lg font-bold tracking-widest outline-none"
          />
          <button onClick={submit} className="mt-4 w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black">
            Submit
          </button>
          <p className="mt-3 text-xs text-mist">Jo pehle sahi word type kare, wo point jeetega.</p>
        </div>
        {error && <p className="mx-4 mt-3 text-sm text-red-300">{error}</p>}
      </main>
    );
  }

  if (phase === "finished") {
    const opponent = match.players?.find((p) => p.uid !== user.uid);
    const myScore = match.scores?.[user.uid] || 0;
    const theirScore = match.scores?.[opponent?.uid] || 0;
    const won = match.winner === user.uid;
    const draw = !match.winner;

    return (
      <main className="min-h-screen bg-void text-ink flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl bg-panel p-7 text-center ring-1 ring-white/10">
          <p className="text-6xl">{draw ? "🤝" : won ? "🏆" : "😔"}</p>
          <h1 className="mt-4 font-display text-2xl font-bold">{draw ? "Draw" : won ? "You Won!" : "You Lost"}</h1>
          <p className="mt-2 text-sm text-mist">You {myScore} — {theirScore} {opponent?.name || ""}</p>
          <Link
            href="/games/word"
            onClick={() => { setMatchId(null); setMatch(null); setPhase("setup"); }}
            className="mt-6 block w-full rounded-full bg-gradient-to-r from-teal-400 to-yellow-300 py-3 font-bold text-black"
          >
            Play Again
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
