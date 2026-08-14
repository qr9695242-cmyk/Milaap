// Display conversion requested for the Milaap virtual economy.
// This does not automatically convert wagered game entries into cashable Diamonds.
export const COINS_PER_DIAMOND = 20000;
export const RUPEES_PER_DIAMOND = 4;

export function coinsToDiamonds(coins) {
 return Math.floor(Number(coins || 0) / COINS_PER_DIAMOND);
}

export function diamondsToReferenceRupees(diamonds) {
 return Number(diamonds || 0) * RUPEES_PER_DIAMOND;
}
