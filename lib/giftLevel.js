// Gift Level ladder — 200 levels, generated (not hand-typed) so the spend
// curve stays smooth from level 1 all the way to level 200. Grows with
// LIFETIME COINS GIFTED (coins spent sending gifts to others), tracked on
// the sender's user doc as `totalCoinsGifted` (see lib/gifts.js sendGift).
//
// This mirrors lib/vip.js exactly, just on a different lifetime counter:
// lib/vip.js → totalRechargedRs (money put in) → 200 levels
// lib/hostLevel.js → diamonds received (gifts received) → 8 levels
// lib/giftLevel.js → totalCoinsGifted (gifts sent out) → 200 levels ← this file
//
// Level 1 unlocks at MIN_GIFT_COINS lifetime gifted, level 200 at
// MAX_GIFT_COINS — everything between is a geometric curve so early levels
// come quickly and later ones are a real grind/flex, same shape as VIP.

export const MAX_GIFT_LEVEL = 200;
const MIN_GIFT_COINS = 10000000; // level 1 threshold
const GIFT_GROWTH_RATE = 1.7; // each level requires 70% more lifetime coins than the one before it

const GIFT_BANDS = [
 { name: "Bronze", from: 1, to: 40, color: "#B87333", glow: "" },
 { name: "Silver", from: 41, to: 80, color: "#C7CDD8", glow: "shadow-[0_0_14px_-4px_rgba(199,205,216,0.6)]" },
 { name: "Gold", from: 81, to: 120, color: "#F5C34D", glow: "shadow-[0_0_18px_-4px_rgba(245,195,77,0.65)]" },
 { name: "Platinum", from: 121, to: 160, color: "#5ED4E8", glow: "shadow-[0_0_20px_-3px_rgba(94,212,232,0.7)]" },
 { name: "Diamond", from: 161, to: 190, color: "#8B5CF6", glow: "shadow-[0_0_24px_-2px_rgba(139,92,246,0.75)] animate-pulse" },
 { name: "Legend", from: 191, to: 200, color: "#FF3B7F", glow: "shadow-[0_0_30px_0px_rgba(255,59,127,0.9)] animate-pulse" },
];

function bandForLevel(level) {
 return GIFT_BANDS.find((b) => level >= b.from && level <= b.to) || GIFT_BANDS[GIFT_BANDS.length - 1];
}

// Level 1 = MIN_GIFT_COINS, every level after that is 70% higher than the
// last (raw * 1.7). By level 200 this is an astronomically large number —
// that's expected per the requested curve, not a bug. Rounded to a clean
// number (proportional to its own magnitude, since a fixed step like
// "nearest 10,000" is meaningless once thresholds pass into the
// quintillions) so thresholds don't look like random noise.
function coinsForLevel(level) {
 if (level <= 0) return 0;
 const raw = MIN_GIFT_COINS * Math.pow(GIFT_GROWTH_RATE, level - 1);
 const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
 const step = magnitude / 100; // keep ~2-3 significant digits of precision
 return Math.round(raw / step) * step;
}

// Compact K/M/B/T/... display for the huge numbers this curve produces at
// higher levels (toLocaleString() alone would print 30+ digit strings).
const COMPACT_UNITS = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd"];
export function formatCompactCoins(n) {
 if (n < 1000) return String(Math.round(n));
 const tier = Math.min(COMPACT_UNITS.length - 1, Math.floor(Math.log10(n) / 3));
 const scaled = n / Math.pow(1000, tier);
 const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
 return `${scaled.toFixed(digits)}${COMPACT_UNITS[tier]}`;
}

function iconForLevel(level) {
 if (level >= 191) return "🔥";
 if (level >= 161) return "👑";
 if (level >= 121) return "💎";
 if (level >= 81) return "🥇";
 if (level >= 41) return "🥈";
 return "🥉";
}

export const GIFT_LEVELS = [
 {
 level: 0,
 name: "No Level",
 minCoins: 0,
 icon: "🌱",
 color: "#9E93B5",
 glow: "",
 band: "No Level",
 },
 ...Array.from({ length: MAX_GIFT_LEVEL }, (_, i) => {
 const level = i + 1;
 const band = bandForLevel(level);
 return {
 level,
 name: level === MAX_GIFT_LEVEL ? "Gift Legend" : `Gift Lv.${level}`,
 minCoins: coinsForLevel(level),
 icon: iconForLevel(level),
 color: band.color,
 glow: band.glow,
 band: band.name,
 };
 }),
];

export function giftLevelForCoins(totalCoinsGifted = 0) {
 let current = GIFT_LEVELS[0];
 for (const tier of GIFT_LEVELS) {
 if (totalCoinsGifted >= tier.minCoins) current = tier;
 }
 return current;
}

export function nextGiftLevel(totalCoinsGifted = 0) {
 return GIFT_LEVELS.find((t) => t.minCoins > totalCoinsGifted) || null;
}

/** 0–1 progress toward the next level, for a progress bar. */
export function giftLevelProgress(totalCoinsGifted = 0) {
 const current = giftLevelForCoins(totalCoinsGifted);
 const next = nextGiftLevel(totalCoinsGifted);
 if (!next) return 1;
 const span = next.minCoins - current.minCoins;
 const into = totalCoinsGifted - current.minCoins;
 return span > 0 ? Math.min(1, Math.max(0, into / span)) : 1;
}

export function giftBands() {
 return GIFT_BANDS;
}
