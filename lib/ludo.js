import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs,
  runTransaction,
} from "firebase/firestore";

// Constants
export const LUDO_STARTING_COINS = 5000;
export const MIN_BET_COINS = 30000;
export const MAX_BET_COINS = 500000;
export const LUDO_BET_AMOUNTS = [30000, 50000, 75000, 100000, 150000, 200000, 250000, 300000, 400000, 500000];

const COLORS = [
  { id: "red", name: "Red", hex: "#ef4444", startOffset: 0 },
  { id: "blue", name: "Blue", hex: "#3b82f6", startOffset: 13 },
  { id: "yellow", name: "Yellow", hex: "#eab308", startOffset: 26 },
  { id: "green", name: "Green", hex: "#22c55e", startOffset: 39 },
];

const RING_SIZE = 52;
const SAFE_CELLS = new Set(COLORS.map((c) => c.startOffset));
const TOKENS_PER_PLAYER = 4;
const HOME_STRETCH_START = 52;
const FINISHED = 58;

// ========== USER LUDO WALLET ==========
export async function initializeUserLudoWallet(userId) {
  const walletRef = doc(db, "users", userId, "ludoWallet", "balance");
  const walletSnap = await getDoc(walletRef);

  if (!walletSnap.exists()) {
    await setDoc(walletRef, {
      coins: LUDO_STARTING_COINS,
      gamesPlayed: 0,
      wins: 0,
      totalEarnings: 0,
      createdAt: serverTimestamp(),
    });
  }
  return walletSnap.data() || { coins: LUDO_STARTING_COINS, gamesPlayed: 0, wins: 0 };
}

export async function getUserLudoBalance(userId) {
  try {
    const walletRef = doc(db, "users", userId, "ludoWallet", "balance");
    const snap = await getDoc(walletRef);
    return snap.data() || { coins: 0 };
  } catch (error) {
    console.error("Error getting Ludo balance:", error);
    return { coins: 0 };
  }
}

/** Live subscription to a user's Ludo wallet (coins, gamesPlayed, wins) — used by the Medal page. */
export function listenUserLudoWallet(userId, callback) {
  const walletRef = doc(db, "users", userId, "ludoWallet", "balance");
  return onSnapshot(walletRef, (snap) => callback(snap.exists() ? snap.data() : null));
}

export async function updateLudoBalance(userId, coinsChange, winIncrease = 0) {
  try {
    const walletRef = doc(db, "users", userId, "ludoWallet", "balance");
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      const data = snap.exists() ? snap.data() : { coins: 0, gamesPlayed: 0, wins: 0, totalEarnings: 0 };
      tx.set(
        walletRef,
        {
          coins: Math.max(0, (data.coins || 0) + coinsChange),
          gamesPlayed: (data.gamesPlayed || 0) + 1,
          wins: (data.wins || 0) + winIncrease,
          totalEarnings: (data.totalEarnings || 0) + Math.max(0, coinsChange),
        },
        { merge: true }
      );
    });
  } catch (error) {
    console.error("Error updating Ludo balance:", error);
  }
}

// ========== MATCHMAKING ==========
export async function findOrCreateLudoMatch(userId, userName, userAvatar, betAmount) {
  if (!LUDO_BET_AMOUNTS.includes(Number(betAmount))) throw new Error("Invalid match amount");
  const walletRef = doc(db, "users", userId, "ludoWallet", "balance");
  // Single equality filter — no composite Firestore index required.
  // betAmount matching is done client-side below.
  const waitingQuery = query(collection(db, "ludoMatches"), where("status", "==", "waiting"));
  const waitingSnap = await getDocs(waitingQuery);
  const candidate = waitingSnap.docs.find(
    d => d.data().betAmount === Number(betAmount) && !(d.data().players || []).some(p => p.userId === userId)
  );

  if (!candidate) {
    const matchRef = doc(collection(db, "ludoMatches"));
    await runTransaction(db, async tx => {
      const wallet = await tx.get(walletRef); const data = wallet.exists() ? wallet.data() : { coins: 0 };
      if ((data.coins || 0) < Number(betAmount)) throw new Error("Insufficient coins");
      tx.update(walletRef, { coins: (data.coins || 0) - Number(betAmount) });
      tx.set(matchRef, {
        status: "waiting", betAmount: Number(betAmount), prizePool: Number(betAmount), maxPlayers: 2,
        players: [{ userId, userName, userAvatar, color: "red", playerIndex: 0, ready: false, entryPaid: true }],
        createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + 2 * 60 * 1000), settled: false,
      });
    });
    return { matchId: matchRef.id, isHost: true };
  }

  const matchRef = doc(db, "ludoMatches", candidate.id);
  await runTransaction(db, async tx => {
    const [m, wallet] = await Promise.all([tx.get(matchRef), tx.get(walletRef)]);
    if (!m.exists()) throw new Error("Match no longer available");
    const data = m.data();
    if (data.status !== "waiting" || (data.players || []).length >= 2) throw new Error("Match is already full");
    if ((data.players || []).some(p => p.userId === userId)) throw new Error("You are already in this match");
    const wd = wallet.exists() ? wallet.data() : { coins: 0 };
    if ((wd.coins || 0) < Number(betAmount)) throw new Error("Insufficient coins");
    tx.update(walletRef, { coins: (wd.coins || 0) - Number(betAmount) });
    tx.update(matchRef, { status: "starting", prizePool: Number(betAmount) * 2, players: [...data.players, { userId, userName, userAvatar, color: "blue", playerIndex: data.players.length, ready: false, entryPaid: true }] });
  });
  return { matchId: candidate.id, isHost: false };
}

// ========== MATCH MANAGEMENT ==========
export async function getMatchData(matchId) {
  try {
    const snap = await getDoc(doc(db, "ludoMatches", matchId));
    return snap.data();
  } catch (error) {
    console.error("Error getting match data:", error);
    return null;
  }
}

export function listenToMatch(matchId, callback) {
  return onSnapshot(doc(db, "ludoMatches", matchId), (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  });
}

export async function markPlayerReady(matchId, userId) {
  try {
    const matchRef = doc(db, "ludoMatches", matchId);
    const matchData = await getMatchData(matchId);

    const updatedPlayers = matchData.players.map((p) =>
      p.userId === userId ? { ...p, ready: true } : p
    );

    const allReady = updatedPlayers.every((p) => p.ready);

    await updateDoc(matchRef, {
      players: updatedPlayers,
      status: allReady ? "playing" : "starting",
      gameState: allReady
        ? initializeGameState(updatedPlayers.length)
        : matchData.gameState,
    });
  } catch (error) {
    console.error("Error marking player ready:", error);
  }
}

// ========== GAME STATE ==========
function initializeGameState(numPlayers) {
  return {
    tokens: Array(numPlayers)
      .fill(null)
      .map(() => Array(TOKENS_PER_PLAYER).fill(0)),
    turn: 0,
    dice: null,
    diceHistory: [],
    moves: [],
    winner: null,
    createdAt: serverTimestamp(),
  };
}

export async function rollDice(matchId, userId) {
  try {
    const matchData = await getMatchData(matchId);
    if (!matchData) return;

    const currentPlayer = matchData.players[matchData.gameState.turn];
    if (currentPlayer.userId !== userId) return; // Not your turn

    const diceValue = 1 + Math.floor(Math.random() * 6);

    await updateDoc(doc(db, "ludoMatches", matchId), {
      "gameState.dice": diceValue,
      "gameState.diceHistory": [...(matchData.gameState.diceHistory || []), diceValue],
    });

    return diceValue;
  } catch (error) {
    console.error("Error rolling dice:", error);
  }
}

export async function makeMove(matchId, userId, tokenIndex) {
  try {
    const matchData = await getMatchData(matchId);
    if (!matchData) return;

    const playerIndex = matchData.players.findIndex((p) => p.userId === userId);
    const { gameState } = matchData;
    const { tokens, turn, dice } = gameState;

    if (turn !== playerIndex || dice === null) return;

    const updatedTokens = tokens.map((arr) => [...arr]);
    const steps = updatedTokens[playerIndex][tokenIndex];
    const newSteps = steps === 0 ? 1 : steps + dice;

    updatedTokens[playerIndex][tokenIndex] = Math.min(newSteps, FINISHED);

    // Check for captures
    const player = matchData.players[playerIndex];
    const landedCell = calculateRingPosition(player, newSteps);

    matchData.players.forEach((opponent, opIdx) => {
      if (opIdx === playerIndex) return;
      updatedTokens[opIdx] = updatedTokens[opIdx].map((s) => {
        if (s >= 1 && s < HOME_STRETCH_START) {
          const opCell = calculateRingPosition(opponent, s);
          if (opCell === landedCell && !SAFE_CELLS.has(landedCell)) {
            return 0; // Captured
          }
        }
        return s;
      });
    });

    const allFinished = updatedTokens[playerIndex].every((s) => s === FINISHED);
    const nextTurn = dice === 6 ? turn : (turn + 1) % matchData.players.length;

    await updateDoc(doc(db, "ludoMatches", matchId), {
      "gameState.tokens": updatedTokens,
      "gameState.dice": null,
      "gameState.turn": allFinished ? turn : nextTurn,
      "gameState.winner": allFinished ? playerIndex : null,
      "gameState.moves": [
        ...(gameState.moves || []),
        { playerIndex, tokenIndex, dice, timestamp: Date.now() },
      ],
    });
  } catch (error) {
    console.error("Error making move:", error);
  }
}

function calculateRingPosition(player, steps) {
  const start = player.color === "red" ? 0 : player.color === "blue" ? 13 : player.color === "yellow" ? 26 : 39;
  return (start + steps - 1 + RING_SIZE) % RING_SIZE;
}

// ========== END GAME & REWARDS ==========
export async function endMatch(matchId, winnerId) {
  const matchRef = doc(db, "ludoMatches", matchId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Match not found");
    const match = snap.data();
    if (match.settled || match.status === "completed") return;
    const winnerWalletRef = doc(db, "users", winnerId, "ludoWallet", "balance");
    const walletSnap = await tx.get(winnerWalletRef);
    const wallet = walletSnap.exists() ? walletSnap.data() : { coins: 0, wins: 0, gamesPlayed: 0, totalEarnings: 0 };
    const prize = Number(match.prizePool || match.betAmount * (match.players?.length || 2));
    tx.set(winnerWalletRef, { ...wallet, coins: (wallet.coins || 0) + prize, wins: (wallet.wins || 0) + 1, gamesPlayed: (wallet.gamesPlayed || 0) + 1, totalEarnings: (wallet.totalEarnings || 0) + prize }, { merge: true });
    tx.update(matchRef, { status: "completed", winnerId, settled: true, prizePool: prize, completedAt: serverTimestamp() });
  });
}

// ========== CLEANUP ==========
export async function cancelMatch(matchId, userId) {
  try {
    const matchRef = doc(db, "ludoMatches", matchId);
    await runTransaction(db, async tx => {
      const snap = await tx.get(matchRef);
      if (!snap.exists()) return;
      const match = snap.data();
      if (match.status !== "waiting") throw new Error("This match can no longer be cancelled");
      const player = (match.players || []).find(p => p.userId === userId && p.entryPaid);
      if (!player) throw new Error("You are not allowed to cancel this match");
      const walletRef = doc(db, "users", userId, "ludoWallet", "balance");
      const walletSnap = await tx.get(walletRef);
      const wallet = walletSnap.exists() ? walletSnap.data() : { coins: 0 };
      tx.set(walletRef, { ...wallet, coins: (wallet.coins || 0) + Number(match.betAmount || 0) }, { merge: true });
      tx.delete(matchRef);
    });
  } catch (error) {
    console.error("Error cancelling match:", error);
    throw error;
  }
}
