// Diamond → Coin exchange rate — now admin-controlled instead of a fixed
// constant in lib/config.js. Same pattern as lib/referral.js: a single
// Firestore doc (config/exchangeRate) that anyone can read (so the Wallet
// screen shows the live rate) but only an admin can write (see the
// "Exchange Rate" card in /admin).
//
// If the doc doesn't exist yet (fresh install, or admin never changed it),
// we fall back to DIAMOND_TO_COIN_RATE from lib/config.js so nothing
// breaks.
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { DIAMOND_TO_COIN_RATE } from "./config";

export const EXCHANGE_RATE_DOC = doc(db, "config", "exchangeRate");

/** Current "1 diamond = X coins" rate. Falls back to the code default. */
export async function getExchangeRate() {
  const snap = await getDoc(EXCHANGE_RATE_DOC);
  if (!snap.exists()) return DIAMOND_TO_COIN_RATE;
  const rate = Number(snap.data()?.rate);
  return rate > 0 ? rate : DIAMOND_TO_COIN_RATE;
}

/** Admin-only (Firestore rules double-check this server-side). */
export async function setExchangeRate(rate) {
  const clean = Number(rate);
  if (!clean || clean <= 0) throw new Error("Rate must be a positive number.");
  await setDoc(
    EXCHANGE_RATE_DOC,
    { rate: clean, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return clean;
}
