// Host Level — grows with lifetime diamonds a host has received from gifts.
// We use the `diamonds` field on the user doc directly: nothing in the app
// currently spends diamonds (there's no withdraw flow yet), so it already
// behaves as a lifetime total, the same shortcut lib/vip.js takes with
// totalRechargedRs vs. the spendable `coins` field.

export const HOST_LEVELS = [
  { level: 1, name: "Rising Host", minDiamonds: 0, icon: "🌱", color: "#9E93B5" },
  { level: 2, name: "Bronze Host", minDiamonds: 1000, icon: "🥉", color: "#C08552" },
  { level: 3, name: "Silver Host", minDiamonds: 5000, icon: "🥈", color: "#C7CDD8" },
  { level: 4, name: "Gold Host", minDiamonds: 20000, icon: "🥇", color: "#F5C34D" },
  { level: 5, name: "Platinum Host", minDiamonds: 50000, icon: "💎", color: "#5ED4E8" },
  { level: 6, name: "Diamond Host", minDiamonds: 150000, icon: "💠", color: "#8B5CF6" },
  { level: 7, name: "Elite Host", minDiamonds: 400000, icon: "👑", color: "#FF3B7F" },
  { level: 8, name: "Legend Host", minDiamonds: 1000000, icon: "🔥", color: "#FF8A3D" },
];

export function hostLevelForDiamonds(diamonds = 0) {
  let current = HOST_LEVELS[0];
  for (const tier of HOST_LEVELS) {
    if (diamonds >= tier.minDiamonds) current = tier;
  }
  return current;
}

export function nextHostLevel(diamonds = 0) {
  return HOST_LEVELS.find((t) => t.minDiamonds > diamonds) || null;
}

/** 0–1 progress toward the next level, for a progress bar. */
export function hostLevelProgress(diamonds = 0) {
  const current = hostLevelForDiamonds(diamonds);
  const next = nextHostLevel(diamonds);
  if (!next) return 1;
  const span = next.minDiamonds - current.minDiamonds;
  const into = diamonds - current.minDiamonds;
  return span > 0 ? Math.min(1, Math.max(0, into / span)) : 1;
}
