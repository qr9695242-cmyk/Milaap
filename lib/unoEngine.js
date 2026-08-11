// Real UNO rules (2-player table): full 108-card deck, colored number/action
// cards, wild + wild draw-4. Pure functions, same pattern as the other game
// engines in this folder. In a 2-player game, Skip and Reverse both have the
// same practical effect: the opponent's turn is skipped and play returns to
// the card's player.

export const COLORS = ["red", "yellow", "green", "blue"];

export function createDeck() {
  const deck = [];
  for (const color of COLORS) {
    deck.push({ color, value: "0" });
    for (let n = 1; n <= 9; n++) { deck.push({ color, value: String(n) }); deck.push({ color, value: String(n) }); }
    for (const action of ["skip", "reverse", "draw2"]) { deck.push({ color, value: action }); deck.push({ color, value: action }); }
  }
  for (let i = 0; i < 4; i++) { deck.push({ color: "wild", value: "wild" }); deck.push({ color: "wild", value: "wild4" }); }
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

/** Deals a fresh shuffled game: two 7-card hands, the draw pile, and an opening discard. */
export function dealGame() {
  let deck = shuffle(createDeck());
  const handA = deck.splice(0, 7);
  const handB = deck.splice(0, 7);
  // Opening card can't be a wild draw-4 (house rule — avoids opening with a forced 4-card draw).
  let top = deck.pop();
  while (top.value === "wild4") { deck.unshift(top); top = deck.pop(); }
  const currentColor = top.color === "wild" ? COLORS[Math.floor(Math.random() * 4)] : top.color;
  return { handA, handB, drawPile: deck, discard: [top], currentColor };
}

export function canPlay(card, topCard, currentColor) {
  if (card.color === "wild") return true;
  return card.color === currentColor || card.value === topCard.value;
}

/** Draws `n` cards from the pile, reshuffling the discard (minus its top card) back in if it runs out. */
export function drawCards(drawPile, discard, n) {
  let pile = drawPile.slice();
  let disc = discard.slice();
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (pile.length === 0) {
      if (disc.length <= 1) break; // nothing left to reshuffle
      const top = disc[disc.length - 1];
      pile = shuffle(disc.slice(0, -1));
      disc = [top];
    }
    drawn.push(pile.pop());
  }
  return { drawn, drawPile: pile, discard: disc };
}

export function cardLabel(card) {
  if (card.value === "wild") return "WILD";
  if (card.value === "wild4") return "+4";
  if (card.value === "draw2") return "+2";
  if (card.value === "skip") return "⦸";
  if (card.value === "reverse") return "⇄";
  return card.value;
}
