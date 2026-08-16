// VIP ladder — 200 levels, generated (not hand-typed) so the spend curve
// stays smooth from level 1 all the way to level 200. Levels are grouped
// into cosmetic "bands" (Bronze → Silver → Gold → Platinum → Diamond →
// SVIP) purely for color/glow theming in the UI — higher bands look more
// premium, mirroring the rarity ladder in lib/decorations.js.
//
// Level 1 unlocks at MIN_SPEND_RS lifetime recharge, level 200 (SVIP) at
// MAX_SPEND_RS — everything between is a geometric curve so early levels
// come quickly and later ones are a real grind/flex.

export const MAX_VIP_LEVEL = 200;
const MIN_SPEND_RS = 5000; // level 1 threshold — tune this to move the whole ladder
const MAX_SPEND_RS = 10000000; // level 200 (SVIP) threshold

// Levels at/above this become "priority" VIPs — can take a front-row seat
// in a full room (see lib/rooms.js takeSeatPriority) and get an entry effect.
export const MIN_PRIORITY_VIP_LEVEL = 20;

const VIP_BANDS = [
 { name: "Bronze", from: 1, to: 40, color: "#B87333", glow: "" },
 { name: "Silver", from: 41, to: 80, color: "#C7CDD8", glow: "shadow-[0_0_14px_-4px_rgba(199,205,216,0.6)]" },
 { name: "Gold", from: 81, to: 120, color: "#F5C34D", glow: "shadow-[0_0_18px_-4px_rgba(245,195,77,0.65)]" },
 { name: "Platinum", from: 121, to: 160, color: "#5ED4E8", glow: "shadow-[0_0_20px_-3px_rgba(94,212,232,0.7)]" },
 { name: "Diamond", from: 161, to: 190, color: "#8B5CF6", glow: "shadow-[0_0_24px_-2px_rgba(139,92,246,0.75)] animate-pulse" },
 { name: "SVIP", from: 191, to: 200, color: "#FF3B7F", glow: "shadow-[0_0_30px_0px_rgba(255,59,127,0.9)] animate-pulse" },
];

function bandForLevel(level) {
 return VIP_BANDS.find((b) => level >= b.from && level <= b.to) || VIP_BANDS[VIP_BANDS.length - 1];
}

// Geometric growth from MIN_SPEND_RS (level 1) to MAX_SPEND_RS (level 200),
// rounded to a clean number so thresholds don't look like random noise.
const GROWTH_RATE = Math.pow(MAX_SPEND_RS / MIN_SPEND_RS, 1 / (MAX_VIP_LEVEL - 1));
function spendForLevel(level) {
 if (level <= 0) return 0;
 const raw = MIN_SPEND_RS * Math.pow(GROWTH_RATE, level - 1);
 const step = raw < 100000 ? 1000 : raw < 1000000 ? 10000 : 10000;
 return Math.round(raw / step) * step;
}

function emojisForLevel(level) {
 if (level >= 191) return ["😎", "🔥", "💜", "👑", "💎", "🚀", "🏆", "🦁", "🌌"];
 if (level >= 121) return ["😎", "🔥", "💜", "👑", "💎", "🚀"];
 if (level >= 81) return ["😎", "🔥", "💜", "👑"];
 if (level >= MIN_PRIORITY_VIP_LEVEL) return ["😎", "🔥", "💜"];
 return [];
}

export const VIP_TIERS = [
 {
 level: 0,
 name: "No VIP",
 minSpendRs: 0,
 color: "#9E93B5",
 glow: "",
 band: "No VIP",
 emojis: [],
 entryEffect: false,
 prioritySeat: false,
 },
 ...Array.from({ length: MAX_VIP_LEVEL }, (_, i) => {
 const level = i + 1;
 const band = bandForLevel(level);
 return {
 level,
 name: level === MAX_VIP_LEVEL ? "SVIP" : `VIP ${level}`,
 minSpendRs: spendForLevel(level),
 color: band.color,
 glow: band.glow,
 band: band.name,
 emojis: emojisForLevel(level),
 entryEffect: level >= MIN_PRIORITY_VIP_LEVEL,
 prioritySeat: level >= MIN_PRIORITY_VIP_LEVEL,
 };
 }),
];

// Seats reserved for priority (VIP20+) entry when a room is full — see
// lib/rooms.js takeSeatPriority(). Front-row seats, TikTok/Bigo host-app
// style ("VIP" users can bump a regular guest out of these seats only).
export const PRIORITY_SEAT_INDEXES = [0, 1];

export function vipLevelForSpend(totalRechargedRs = 0) {
 let current = VIP_TIERS[0];
 for (const tier of VIP_TIERS) {
 if (totalRechargedRs >= tier.minSpendRs) current = tier;
 }
 return current;
}

export function nextVipTier(totalRechargedRs = 0) {
 return VIP_TIERS.find((t) => t.minSpendRs > totalRechargedRs) || null;
}

export function vipBands() {
 return VIP_BANDS;
}
