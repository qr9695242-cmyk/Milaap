// Referral / "Invite Friends" program.
//
// How it works end-to-end:
//   1. Every user gets a short, unique `referralCode` (generated lazily the
//      first time they open /invite, or right at signup if we have their
//      uid already). Reserved in the `referralCodes` collection so two
//      users can never collide.
//   2. /invite builds a REAL link: `${origin}/signup?ref=<code>`.
//   3. When someone signs up through that link, app/signup/page.js stores
//      `referredByCode` on their new user doc.
//   4. The Cloud Function `awardReferralBonus` (functions/index.js) — not
//      client code, so it can't be spoofed — reads config/referral, and if
//      the program is currently ON and not expired, credits the referrer's
//      coins and notifies them.
//   5. config/referral is admin-controlled (see the Referral card in
//      /admin): turn it off any time, turn it back on for another 6-month
//      run whenever you like — see setReferralConfig below.
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const REFERRAL_CONFIG_DOC = doc(db, "config", "referral");

// Defaults used the very first time an admin turns the program on.
export const DEFAULT_REFERRAL_COINS = 20000;
export const DEFAULT_REFERRAL_MONTHS = 6;

function randomCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Returns this user's referral code, generating + reserving one if they
 * don't have one yet. Safe to call every time /invite mounts.
 */
export async function ensureReferralCode(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.data()?.referralCode;
  if (existing) return existing;

  // Try a few random codes until one isn't already reserved.
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const codeRef = doc(db, "referralCodes", code);
    try {
      await runTransaction(db, async (tx) => {
        const codeSnap = await tx.get(codeRef);
        if (codeSnap.exists()) throw new Error("taken");
        tx.set(codeRef, { uid, createdAt: serverTimestamp() });
        tx.set(userRef, { referralCode: code }, { merge: true });
      });
      return code;
    } catch (err) {
      if (err.message === "taken") continue; // collision, try another code
      throw err;
    }
  }
  throw new Error("Could not generate a unique referral code, try again.");
}

/** Public read (used by /invite to show the current reward + offer status). */
export async function getReferralConfig() {
  const snap = await getDoc(REFERRAL_CONFIG_DOC);
  if (!snap.exists()) {
    return { enabled: false, coinsPerReferral: DEFAULT_REFERRAL_COINS, expiresAt: null };
  }
  const data = snap.data();
  return {
    enabled: !!data.enabled,
    coinsPerReferral: data.coinsPerReferral ?? DEFAULT_REFERRAL_COINS,
    expiresAt: data.expiresAt?.toDate?.() ?? null,
  };
}

/**
 * Admin-only (Firestore rules double-check this server-side too).
 * turnOn=true starts a fresh N-month run from right now. turnOn=false just
 * flips `enabled` off without touching the coin amount or dates, so a later
 * "turn back on" (without months specified) simply resumes.
 */
export async function setReferralConfig({ turnOn, coinsPerReferral, months = DEFAULT_REFERRAL_MONTHS }) {
  const current = await getReferralConfig();
  const patch = {
    enabled: !!turnOn,
    coinsPerReferral: coinsPerReferral ?? current.coinsPerReferral ?? DEFAULT_REFERRAL_COINS,
  };
  if (turnOn) {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    patch.expiresAt = expires;
    patch.activatedAt = serverTimestamp();
  }
  await setDoc(REFERRAL_CONFIG_DOC, patch, { merge: true });
}
