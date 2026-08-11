// Standard double-six dominoes: 28 tiles (0-0 through 6-6), 7 tiles dealt to
// each of 2 players, rest form the boneyard. Highest double opens the chain.
// Pure functions, same pattern as checkersEngine.js / snakeLadderEngine.js.

export function createDeck() {
  const deck = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) deck.push({ a, b });
  return deck;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deals a fresh shuffled game: two 7-tile hands + the remaining boneyard. */
export function dealGame() {
  const deck = shuffle(createDeck());
  const handA = deck.splice(0, 7);
  const handB = deck.splice(0, 7);
  return { handA, handB, boneyard: deck };
}

function highestDouble(hand) {
  let best = null;
  for (const t of hand) if (t.a === t.b && (!best || t.a > best.a)) best = t;
  return best;
}

/** Who opens: whoever holds the highest double tile (classic rule). Ties impossible (one deck). */
export function findStarter(handA, handB) {
  const da = highestDouble(handA);
  const db = highestDouble(handB);
  if (da && db) return da.a >= db.a ? "a" : "b";
  if (da) return "a";
  if (db) return "b";
  return "a"; // no doubles in either hand (rare) — host opens with any tile
}

export function tileMatches(tile, end) {
  return tile.a === end || tile.b === end;
}

export function canPlayAny(hand, leftEnd, rightEnd) {
  if (leftEnd == null) return hand.length > 0; // chain not started yet — any tile opens it
  return hand.some((t) => tileMatches(t, leftEnd) || tileMatches(t, rightEnd));
}

/** Plays `tile` onto the given open end, returning the new chain ends. */
export function playTile(tile, side, leftEnd, rightEnd) {
  if (leftEnd == null) return { leftEnd: tile.a, rightEnd: tile.b }; // first tile of the game
  if (side === "left") {
    const connect = tile.a === leftEnd ? tile.b : tile.a;
    return { leftEnd: connect, rightEnd };
  }
  const connect = tile.a === rightEnd ? tile.b : tile.a;
  return { leftEnd, rightEnd: connect };
}

export function pipTotal(hand) {
  return hand.reduce((s, t) => s + t.a + t.b, 0);
}

export function tileKey(t) {
  return `${t.a}-${t.b}`;
}
