// Medals — unlike VIP/Gift/Host levels (which are smooth 200-step ladders),
// medals are one-off badges that flip on the moment a specific activity
// milestone is hit. Each medal's `check()` reads from data that's already
// tracked elsewhere in the app (no new writes needed):
//
// First Match → lib/ludo.js users/{uid}/ludoWallet/balance.gamesPlayed
// Gift Star → lib/gifts.js users/{uid}.totalCoinsGifted (via lib/giftLevel.js)
// Game Winner → lib/ludo.js users/{uid}/ludoWallet/balance.wins
// Top Host → lib/hostLevel.js users/{uid}.diamonds (lifetime received)
// VIP → lib/vip.js users/{uid}.totalRechargedRs
// Legend → whichever ladder above reaches its top "Legend" band first
//
// `ctx` passed into check() is { profile, ludoWallet }: profile is the
// live user doc from AuthContext, ludoWallet is users/{uid}/ludoWallet/balance
// (see lib/ludo.js) — null until the player has played their first Ludo game.

import { giftLevelForCoins } from "./giftLevel";
import { vipLevelForSpend } from "./vip";
import { hostLevelForDiamonds } from "./hostLevel";

export const MEDALS = [
 {
 id: "first_match",
 name: "First Match",
 icon: "🥉",
 description: "Play your first game",
 check: (ctx) => (ctx.ludoWallet?.gamesPlayed || 0) >= 1,
 },
 {
 id: "gift_star",
 name: "Gift Star",
 icon: "💝",
 description: "Send your first gift",
 check: (ctx) => giftLevelForCoins(ctx.profile?.totalCoinsGifted || 0).level >= 1,
 },
 {
 id: "game_winner",
 name: "Game Winner",
 icon: "🏆",
 description: "Win a match",
 check: (ctx) => (ctx.ludoWallet?.wins || 0) >= 1,
 },
 {
 id: "top_host",
 name: "Top Host",
 icon: "⭐",
 description: "Reach Silver Host (5,000+ lifetime diamonds received)",
 check: (ctx) => hostLevelForDiamonds(ctx.profile?.diamonds || 0).level >= 3,
 },
 {
 id: "vip",
 name: "VIP",
 icon: "💎",
 description: "Become a VIP member",
 check: (ctx) => vipLevelForSpend(ctx.profile?.totalRechargedRs || 0).level >= 1,
 },
 {
 id: "legend",
 name: "Legend",
 icon: "👑",
 description: "Reach the top Legend band on VIP, Gift, or Host level",
 check: (ctx) =>
 vipLevelForSpend(ctx.profile?.totalRechargedRs || 0).band === "SVIP" ||
 giftLevelForCoins(ctx.profile?.totalCoinsGifted || 0).band === "Legend" ||
 hostLevelForDiamonds(ctx.profile?.diamonds || 0).level >= 8,
 },
];

/** Returns MEDALS with an `unlocked` boolean attached, given live profile + ludoWallet data. */
export function medalsWithStatus(ctx) {
 return MEDALS.map((m) => ({ ...m, unlocked: m.check(ctx) }));
}
