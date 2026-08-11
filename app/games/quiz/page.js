"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import {
  quickMatchCasual, listenCasualMatch, updateCasualMatch, cancelCasualMatch,
} from "@/lib/casualMatches";

const QUESTIONS = [
  { q: "Pakistan ka capital kya hai?", options: ["Karachi", "Lahore", "Islamabad", "Peshawar"], correct: 2 },
  { q: "1 + 1 x 2 = ?", options: ["4", "3", "2", "6"], correct: 1 },
  { q: "Sabse bada continent kaunsa hai?", options: ["Africa", "Asia", "Europe", "Antarctica"], correct: 1 },
  { q: "Pani ka chemical formula kya hai?", options: ["CO2", "H2O", "O2", "NaCl"], correct: 1 },
  { q: "Ek saal mein kitne mahine hote hain?", options: ["10", "12", "13", "11"], correct: 1 },
  { q: "Sooraj kis direction se nikalta hai?", options: ["West", "North", "East", "South"], correct: 2 },
  { q: "Cricket team mein kitne players hote hain?", options: ["9", "10", "11", "12"], correct: 2 },
  { q: "Sabse tez janwar kaunsa hai?", options: ["Cheetah", "Lion", "Horse", "Deer"], correct: 0 },
  { q: "Human body mein kitni haddiyan hoti hain?", options: ["186", "206", "226", "246"], correct: 1 },
  { q: "Pakistan ki qaumi zaban kya hai?", options: ["Punjabi", "Sindhi", "Urdu", "Pashto"], correct: 2 },
];

const ROUNDS = 5;

function pickQuestions() {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ROUNDS);
}

export default function QuizPage() {
  const { user, profile, loading } = useAuth();
  const [phase, setPhase] = useState("setup");
  const [matchId, setMatchId] = useState(null);
  const [match, setMatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    return listenCasualMatch(matchId, (next) => {
      setMatch(next);
      if (!next) return;
      if (next.status === "waiting") setPhase("searching");
      else if (next.status === "playing") setPhase("playing");
      else if (next.status === "finished") setPhase("finished");
      setAnswered(false);
    }, (err) => setError(err.message || "Match sync error."));
  }, [matchId]);

  if (loading || !user) {
    return <main className="min-h-screen bg-void flex items-center justify-center text-mist">Loading…</main>;
  }

  async function startQuick() {
    setError(""); setBusy(true);
    try {
      const questions = pickQuestions();
      const id = await quickMatchCasual({
        gameId: "quiz",
        uid: user.uid,
        name: profile?.displayName || "Player",
        initialState: { questions, round: 0, scores: { [user.uid]: 0 }, roundAnswers: {} },
      });
      setMatchId(id);
      setPhase("searching");
    } catch (e) { setError(e.message || "Match nahi bana."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    try { await cancelCasualMatch(matchId); setMatchId(null); setMatch(null); setPhase("setup"); }
    catch (e) { setError(e.message || "Cancel failed."); }
    finally { setBusy(false); }
  }

  // Seed scores for the joining player once both are present.
  useEffect(() => {
    if (!match || match.status !== "playing") return;
    if (match.scores?.[match.players?.[1]?.uid] !== undefined) return;
    if (match.hostUid === user.uid) return; // host already has a score entry
    updateCasualMatch(matchId, { [`scores.${user.uid}`]: 0 }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status]);

  async function answer(optionIdx) {
    if (answered || !match) return;
    setAnswered(true);
    const q = match.questions[match.round];
    const correct = optionIdx === q.correct;
    const myAnswers = { ...(match.roundAnswers || {}), [user.uid]: optionIdx };
    const bothAnswered = match.playerUids.every((uid) => myAnswers[uid] !== undefined);

    const patch = { [`roundAnswers.${user.uid}`]: optionIdx };
    if (correct) patch[`scores.${user.uid}`] = (match.scores?.[user.uid] || 0) + 1;

    if (bothAnswered) {
      const nextRound = match.round + 1;
      if (nextRound >= match.questions.length) {
        const finalScores = { ...match.scores, [user.uid]: (match.scores?.[user.uid] || 0) + (correct ? 1 : 0) };
        const [a, b] = match.playerUids;
        const winner =
          (finalScores[a] || 0) === (finalScores[b] || 0) ? null : (finalScores[a] || 0) > (finalScores[b] || 0) ? a : b;
        patch.status = "finished";
        patch.winner = winner;
      } else {
        patch.round = nextRound;
        patch.roundAnswers = {};
      }
    }
    try { await updateCasualMatch(matchId, patch); }
    catch (e) { setError(e.message || "Answer save nahi hua."); }
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <div>
            <h1 className="font-display text-xl font-bold">Quiz Battle</h1>
            <p className="text-sm text-mist">Live 1v1 trivia • {ROUNDS} questions • free</p>
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel2 text-5xl ring-1 ring-white/10">🧠</div>
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
    const q = match.questions[match.round];
    const opponent = match.players?.find((p) => p.uid !== user.uid);
    const myScore = match.scores?.[user.uid] || 0;
    const theirScore = match.scores?.[opponent?.uid] || 0;
    const myAnswer = match.roundAnswers?.[user.uid];

    return (
      <main className="min-h-screen bg-void text-ink pb-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-3">
          <Link href="/games" className="text-2xl text-mist">‹</Link>
          <p className="text-sm font-semibold">Q{match.round + 1}/{match.questions.length}</p>
          <span className="text-xs text-mist">You {myScore} — {theirScore} {opponent?.name || "…"}</span>
        </header>

        <div className="mx-4 mt-4 rounded-2xl bg-panel p-5 ring-1 ring-white/10">
          <p className="font-display text-lg font-bold">{q.q}</p>
          <div className="mt-4 space-y-2">
            {q.options.map((opt, i) => {
              const isMine = myAnswer === i;
              const showCorrect = myAnswer !== undefined && i === q.correct;
              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => answer(i)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ring-1 ${
                    showCorrect
                      ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40"
                      : isMine
                        ? "bg-red-500/20 text-red-300 ring-red-400/40"
                        : "bg-panel2 text-ink ring-white/10"
                  } disabled:opacity-80`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {answered && (
            <p className="mt-4 text-center text-xs text-mist">Opponent ka jawab ka wait ho raha hai…</p>
          )}
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
            href="/games/quiz"
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
