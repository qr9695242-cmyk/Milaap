import { DIAMOND_TO_COIN_RATE, MILAAP_ECONOMY } from "./config";

// Unified Milaap conversion display.
export const COINS_PER_DIAMOND = MILAAP_ECONOMY.exchangeCoinsPerDiamond || DIAMOND_TO_COIN_RATE;
export const RUPEES_PER_DIAMOND = MILAAP_ECONOMY.rupeesPerDiamond || 1;

export function coinsToDiamonds(coins) {
 return Math.floor(Number(coins || 0) / COINS_PER_DIAMOND);
}

export function diamondsToReferenceRupees(diamonds) {
 return Number(diamonds || 0) * RUPEES_PER_DIAMOND;
}
