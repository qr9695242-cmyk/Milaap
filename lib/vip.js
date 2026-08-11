export const VIP_TIERS = [
  { level: 0, name: "No VIP", minSpendRs: 0, color: "#9E93B5", emojis: [], entryEffect: false, prioritySeat: false },
  {
    level: 1,
    name: "VIP 1",
    minSpendRs: 500000,
    color: "#8B5CF6",
    emojis: ["😎", "🔥", "💜"],
    entryEffect: false,
    prioritySeat: false,
  },
  {
    level: 2,
    name: "VIP 2",
    minSpendRs: 5000000,
    color: "#FF3B7F",
    emojis: ["😎", "🔥", "💜", "👑", "💎"],
    entryEffect: true,
    prioritySeat: true,
  },
  {
    level: 3,
    name: "VIP 3",
    minSpendRs: 15000000,
    color: "#FF8A3D",
    emojis: ["😎", "🔥", "💜", "👑", "💎", "🚀", "🏆"],
    entryEffect: true,
    prioritySeat: true,
  },
  {
    level: 4,
    name: "SVIP",
    minSpendRs: 50000000,
    color: "#F5C34D",
    emojis: ["😎", "🔥", "💜", "👑", "💎", "🚀", "🏆", "🦁", "🌌"],
    entryEffect: true,
    prioritySeat: true,
  },
];

// Seats reserved for priority (VIP2+) entry when a room is full — see
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
