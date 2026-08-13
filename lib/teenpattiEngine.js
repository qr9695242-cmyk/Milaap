// Real Teen Patti (3-card poker) engine: deck, dealing, and standard hand
// ranking (Trail > Pure Sequence > Sequence > Color > Pair > High Card).
export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANK_LABEL = { 2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K",14:"A" };

let _id = 0;
export function buildDeck() {
  _id = 0;
  const deck = [];
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ id: `t${_id++}`, suit, rank });
  return deck;
}

export function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealHands(uidA, uidB) {
  const deck = shuffle(buildDeck());
  return { [uidA]: deck.splice(0, 3), [uidB]: deck.splice(0, 3), deck };
}

export function cardLabel(c) { return `${RANK_LABEL[c.rank]}${c.suit}`; }

// Hand ranks, higher wins.
const RANK_TRAIL = 6, RANK_PURE_SEQ = 5, RANK_SEQ = 4, RANK_COLOR = 3, RANK_PAIR = 2, RANK_HIGH = 1;

function isSequence(sortedRanks) {
  // sortedRanks: 3 ranks ascending, e.g. [4,5,6]. Handles A-2-3 and Q-K-A.
  const [a, b, c] = sortedRanks;
  if (c - b === 1 && b - a === 1) return true;
  if (a === 2 && b === 3 && c === 14) return true; // A-2-3
  if (a === 12 && b === 13 && c === 14) return true; // Q-K-A
  return false;
}

export function evaluateHand(cards) {
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const sameSuit = cards.every((c) => c.suit === cards[0].suit);
  const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const seq = isSequence(ranks);
  // A-2-3 sorts to [2,3,14]; treat as low sequence [1,2,3] for tiebreak comparisons.
  const seqRanks = (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14) ? [1, 2, 3] : ranks;

  let rank, tiebreak;
  if (isTrail) { rank = RANK_TRAIL; tiebreak = ranks; }
  else if (seq && sameSuit) { rank = RANK_PURE_SEQ; tiebreak = seqRanks; }
  else if (seq) { rank = RANK_SEQ; tiebreak = seqRanks; }
  else if (sameSuit) { rank = RANK_COLOR; tiebreak = [...ranks].reverse(); }
  else if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
    const pairRank = ranks[0] === ranks[1] ? ranks[0] : ranks[1];
    const kicker = ranks[0] === ranks[1] ? ranks[2] : ranks[0];
    rank = RANK_PAIR; tiebreak = [pairRank, kicker];
  } else { rank = RANK_HIGH; tiebreak = [...ranks].reverse(); }

  return { rank, tiebreak, label: handLabel(rank) };
}

function handLabel(rank) {
  return { [RANK_TRAIL]:"Trail (Three of a Kind)", [RANK_PURE_SEQ]:"Pure Sequence", [RANK_SEQ]:"Sequence",
    [RANK_COLOR]:"Color", [RANK_PAIR]:"Pair", [RANK_HIGH]:"High Card" }[rank];
}

/** Returns 1 if A wins, -1 if B wins, 0 if truly tied (extremely rare with a single deck). */
export function compareHands(cardsA, cardsB) {
  const a = evaluateHand(cardsA), b = evaluateHand(cardsB);
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  for (let i = 0; i < a.tiebreak.length; i++) {
    if (a.tiebreak[i] !== b.tiebreak[i]) return a.tiebreak[i] > b.tiebreak[i] ? 1 : -1;
  }
  return 0;
}
