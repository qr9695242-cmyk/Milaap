// Frames (avatar rings) and Vehicles (entry rides) — cosmetic shop.
// Mirrors the pattern in lib/rewards.js: catalog lives here as plain data,
// purchase/equip run as Firestore transactions on the user's own doc, and
// UI (app/profile/frames, app/profile/vehicles) just renders + calls in.
//
// User doc fields used:
//   ownedFrames:   string[]   — frame ids the user has bought (or been given)
//   ownedVehicles: string[]   — vehicle ids the user has bought
//   equippedFrame:   string | null
//   equippedVehicle: string | null

import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

// rarity → border glow used by the shop grid + equipped badge
export const RARITY_STYLE = {
  common: { label: "Common", ring: "ring-mist/30", glow: "" },
  rare: { label: "Rare", ring: "ring-diamond/50", glow: "shadow-[0_0_18px_-4px_rgba(94,212,232,0.6)]" },
  epic: { label: "Epic", ring: "ring-neon-violet/60", glow: "shadow-[0_0_18px_-4px_rgba(139,92,246,0.6)]" },
  legendary: { label: "Legendary", ring: "ring-gold/70", glow: "shadow-[0_0_22px_-2px_rgba(245,195,77,0.7)] animate-pulse" },
  mythic: { label: "Mythic", ring: "ring-neon-pink/80", glow: "shadow-[0_0_28px_0px_rgba(255,59,127,0.85)] animate-pulse" },
};

// Every frame is a CSS gradient ring (no external art assets needed) plus
// an emoji glyph so it still reads fine on small screens / low-end phones.
export const FRAME_CATALOG = [
  { id: "frame_none", name: "No Frame", priceCoins: 0, rarity: "common", emoji: "", gradient: "transparent", free: true },

  // Common
  { id: "frame_silver", name: "Silver Ring", priceCoins: 300, rarity: "common", emoji: "⚪", image: "/frames/frame_silver.png", gradient: "linear-gradient(135deg,#C7CDD8,#8E97A8)" },
  { id: "frame_bronze", name: "Bronze Halo", priceCoins: 350, rarity: "common", emoji: "🟤", image: "/frames/frame_bronze.png", gradient: "linear-gradient(135deg,#B87333,#7A4A1E)" },
  { id: "frame_denim", name: "Denim Loop", priceCoins: 400, rarity: "common", emoji: "🔵", image: "/frames/frame_denim.png", gradient: "linear-gradient(135deg,#4B6C9E,#2C3E5C)" },
  { id: "frame_mint", name: "Mint Breeze", priceCoins: 450, rarity: "common", emoji: "🍃", image: "/frames/frame_mint.png", gradient: "linear-gradient(135deg,#7FE8C0,#3BA383)" },
  { id: "frame_coral", name: "Coral Reef", priceCoins: 500, rarity: "common", emoji: "🪸", image: "/frames/frame_coral.png", gradient: "linear-gradient(135deg,#FF9E80,#FF6F61)" },

  // Rare
  { id: "frame_rose", name: "Rose Bloom", priceCoins: 800, rarity: "rare", emoji: "🌹", image: "/frames/frame_rose.png", gradient: "linear-gradient(135deg,#FF3B7F,#FF8AB4)" },
  { id: "frame_ocean", name: "Ocean Wave", priceCoins: 800, rarity: "rare", emoji: "🌊", image: "/frames/frame_ocean.png", gradient: "linear-gradient(135deg,#5ED4E8,#2B7A9E)" },
  { id: "frame_amber", name: "Amber Glow", priceCoins: 900, rarity: "rare", emoji: "🟠", image: "/frames/frame_amber.png", gradient: "linear-gradient(135deg,#FFB347,#FF7A18)" },
  { id: "frame_violet", name: "Violet Mist", priceCoins: 950, rarity: "rare", emoji: "💜", image: "/frames/frame_violet.png", gradient: "linear-gradient(135deg,#A78BFA,#6D28D9)" },
  { id: "frame_sapphire", name: "Sapphire Frost", priceCoins: 1000, rarity: "rare", emoji: "💎", image: "/frames/frame_sapphire.png", gradient: "linear-gradient(135deg,#5AC8FA,#1E5FB4)" },
  { id: "frame_emerald_vine", name: "Emerald Vine", priceCoins: 1100, rarity: "rare", emoji: "🌿", image: "/frames/frame_emerald_vine.png", gradient: "linear-gradient(135deg,#34D399,#065F46)" },

  // Epic
  { id: "frame_phoenix", name: "Phoenix Wings", priceCoins: 2500, rarity: "epic", emoji: "🔥", image: "/frames/frame_phoenix.png", gradient: "linear-gradient(135deg,#FF8A3D,#FF3B7F)" },
  { id: "frame_dragon", name: "Emerald Dragon", priceCoins: 2500, rarity: "epic", emoji: "🐉", image: "/frames/frame_dragon.png", gradient: "linear-gradient(135deg,#22C55E,#0EA5A5)" },
  { id: "frame_falcon", name: "Storm Falcon", priceCoins: 2700, rarity: "epic", emoji: "🦅", image: "/frames/frame_falcon.png", gradient: "linear-gradient(135deg,#94A3B8,#334155)" },
  { id: "frame_wolf", name: "Crimson Wolf", priceCoins: 2800, rarity: "epic", emoji: "🐺", image: "/frames/frame_wolf.png", gradient: "linear-gradient(135deg,#EF4444,#111827)" },
  { id: "frame_fox", name: "Arctic Fox", priceCoins: 2900, rarity: "epic", emoji: "🦊", image: "/frames/frame_fox.png", gradient: "linear-gradient(135deg,#E0F2FE,#38BDF8)" },
  { id: "frame_lotus", name: "Golden Lotus", priceCoins: 3000, rarity: "epic", emoji: "🪷", image: "/frames/frame_lotus.png", gradient: "linear-gradient(135deg,#F5C34D,#FF8AB4)" },
  { id: "frame_serpent", name: "Neon Serpent", priceCoins: 3200, rarity: "epic", emoji: "🐍", image: "/frames/frame_serpent.png", gradient: "linear-gradient(135deg,#39FF88,#8B5CF6)" },

  // Legendary
  { id: "frame_royal", name: "Royal Crown", priceCoins: 6000, rarity: "legendary", emoji: "👑", image: "/frames/frame_royal.png", gradient: "linear-gradient(135deg,#F5C34D,#FF8A3D,#8B5CF6)" },
  { id: "frame_galaxy", name: "Galaxy Halo", priceCoins: 6000, rarity: "legendary", emoji: "🌌", image: "/frames/frame_galaxy.png", gradient: "linear-gradient(135deg,#8B5CF6,#5ED4E8,#FF3B7F)" },
  { id: "frame_eagle", name: "Eagle Sovereign", priceCoins: 6500, rarity: "legendary", emoji: "🦅", image: "/frames/frame_eagle.png", gradient: "linear-gradient(135deg,#E5E7EB,#5AC8FA,#1E3A8A)" },
  { id: "frame_griffin", name: "Griffin Ascend", priceCoins: 7000, rarity: "legendary", emoji: "🦁", image: "/frames/frame_griffin.png", gradient: "linear-gradient(135deg,#F5C34D,#FFFFFF,#F5C34D)" },
  { id: "frame_inferno", name: "Inferno King", priceCoins: 7500, rarity: "legendary", emoji: "👹", image: "/frames/frame_inferno.png", gradient: "linear-gradient(135deg,#DC2626,#FF8A3D,#111827)" },
  { id: "frame_empress", name: "Celestial Empress", priceCoins: 8000, rarity: "legendary", emoji: "👸", image: "/frames/frame_empress.png", gradient: "linear-gradient(135deg,#FF8AB4,#8B5CF6,#F5C34D)" },
  { id: "frame_vortex", name: "Diamond Vortex", priceCoins: 8500, rarity: "legendary", emoji: "💠", image: "/frames/frame_vortex.png", gradient: "linear-gradient(135deg,#5ED4E8,#2563EB,#0EA5A5)" },

  // Mythic (SVIP-tier)
  { id: "frame_svip_aurora", name: "SVIP Aurora", priceCoins: 15000, rarity: "mythic", emoji: "🌈", image: "/frames/frame_svip_aurora.png", gradient: "linear-gradient(135deg,#FF3B7F,#8B5CF6,#5ED4E8,#F5C34D)" },
  { id: "frame_svip_eclipse", name: "SVIP Eclipse", priceCoins: 16000, rarity: "mythic", emoji: "🌑", image: "/frames/frame_svip_eclipse.png", gradient: "linear-gradient(135deg,#0B0B12,#F5C34D,#0B0B12)" },
  { id: "frame_svip_zenith", name: "SVIP Zenith", priceCoins: 18000, rarity: "mythic", emoji: "⭐", image: "/frames/frame_svip_zenith.png", gradient: "linear-gradient(135deg,#FFFFFF,#F5C34D,#FF8A3D)" },
  { id: "frame_cosmic_throne", name: "Cosmic Throne", priceCoins: 20000, rarity: "mythic", emoji: "👑", image: "/frames/frame_cosmic_throne.png", gradient: "linear-gradient(135deg,#8B5CF6,#FF3B7F,#F5C34D,#5ED4E8)" },
];

export const VEHICLE_CATALOG = [
  { id: "veh_none", name: "No Ride", priceCoins: 0, rarity: "common", emoji: "🚶", gradient: "transparent", free: true },

  // Common
  { id: "veh_bike", name: "City Bike", priceCoins: 400, rarity: "common", emoji: "🏍️", image: "/vehicles/veh_bike.png", gradient: "linear-gradient(135deg,#C7CDD8,#8E97A8)" },
  { id: "veh_scooter", name: "Electric Scooter", priceCoins: 450, rarity: "common", emoji: "🛴", image: "/vehicles/veh_scooter.png", gradient: "linear-gradient(135deg,#94A3B8,#475569)" },
  { id: "veh_skateboard", name: "Skateboard", priceCoins: 350, rarity: "common", emoji: "🛹", image: "/vehicles/veh_skateboard.png", gradient: "linear-gradient(135deg,#FF9E80,#FF6F61)" },
  { id: "veh_hoverboard", name: "Hoverboard", priceCoins: 500, rarity: "common", emoji: "🛼", image: "/vehicles/veh_hoverboard.png", gradient: "linear-gradient(135deg,#7FE8C0,#3BA383)" },
  { id: "veh_bicycle", name: "Retro Bicycle", priceCoins: 380, rarity: "common", emoji: "🚲", image: "/vehicles/veh_bicycle.png", gradient: "linear-gradient(135deg,#B87333,#7A4A1E)" },

  // Rare
  { id: "veh_sedan", name: "Classic Sedan", priceCoins: 1200, rarity: "rare", emoji: "🚗", image: "/vehicles/veh_sedan.png", gradient: "linear-gradient(135deg,#5ED4E8,#2B7A9E)" },
  { id: "veh_cruiser", name: "Cruiser Bike", priceCoins: 1300, rarity: "rare", emoji: "🏍️", image: "/vehicles/veh_cruiser.png", gradient: "linear-gradient(135deg,#FF3B7F,#FF8AB4)" },
  { id: "veh_speedboat", name: "Speed Boat", priceCoins: 1500, rarity: "rare", emoji: "🚤", image: "/vehicles/veh_speedboat.png", gradient: "linear-gradient(135deg,#5AC8FA,#1E5FB4)" },
  { id: "veh_convertible", name: "Vintage Convertible", priceCoins: 1600, rarity: "rare", emoji: "🚙", image: "/vehicles/veh_convertible.png", gradient: "linear-gradient(135deg,#FFB347,#FF7A18)" },
  { id: "veh_atv", name: "Desert ATV", priceCoins: 1400, rarity: "rare", emoji: "🏎️", image: "/vehicles/veh_atv.png", gradient: "linear-gradient(135deg,#D4A373,#7A4A1E)" },
  { id: "veh_snowmobile", name: "Snowmobile", priceCoins: 1550, rarity: "rare", emoji: "❄️", image: "/vehicles/veh_snowmobile.png", gradient: "linear-gradient(135deg,#E0F2FE,#38BDF8)" },

  // Epic
  { id: "veh_sports", name: "Sports Coupe", priceCoins: 3500, rarity: "epic", emoji: "🏎️", image: "/vehicles/veh_sports.png", gradient: "linear-gradient(135deg,#EF4444,#111827)" },
  { id: "veh_yacht", name: "Private Yacht", priceCoins: 5000, rarity: "epic", emoji: "🛥️", image: "/vehicles/veh_yacht.png", gradient: "linear-gradient(135deg,#5ED4E8,#0EA5A5)" },
  { id: "veh_racebike", name: "Racing Superbike", priceCoins: 3800, rarity: "epic", emoji: "🏍️", image: "/vehicles/veh_racebike.png", gradient: "linear-gradient(135deg,#39FF88,#111827)" },
  { id: "veh_armored", name: "Armored Truck", priceCoins: 4000, rarity: "epic", emoji: "🚚", image: "/vehicles/veh_armored.png", gradient: "linear-gradient(135deg,#94A3B8,#1F2937)" },
  { id: "veh_jetski", name: "Stealth Jet-Ski", priceCoins: 4200, rarity: "epic", emoji: "🚤", image: "/vehicles/veh_jetski.png", gradient: "linear-gradient(135deg,#0F172A,#5ED4E8)" },
  { id: "veh_heli", name: "Private Helicopter", priceCoins: 4800, rarity: "epic", emoji: "🚁", image: "/vehicles/veh_heli.png", gradient: "linear-gradient(135deg,#F5C34D,#334155)" },
  { id: "veh_monstertruck", name: "Monster Truck", priceCoins: 4500, rarity: "epic", emoji: "🚛", image: "/vehicles/veh_monstertruck.png", gradient: "linear-gradient(135deg,#FF8A3D,#111827)" },

  // Legendary
  { id: "veh_jet", name: "Private Jet", priceCoins: 9000, rarity: "legendary", emoji: "🛩️", image: "/vehicles/veh_jet.png", gradient: "linear-gradient(135deg,#E5E7EB,#5AC8FA,#1E3A8A)" },
  { id: "veh_supercar", name: "Golden Supercar", priceCoins: 12000, rarity: "legendary", emoji: "🏁", image: "/vehicles/veh_supercar.png", gradient: "linear-gradient(135deg,#F5C34D,#FF8A3D,#111827)" },
  { id: "veh_limo", name: "Phantom Limousine", priceCoins: 13000, rarity: "legendary", emoji: "🚘", image: "/vehicles/veh_limo.png", gradient: "linear-gradient(135deg,#0B0B12,#F5C34D)" },
  { id: "veh_icechariot", name: "Ice Chariot", priceCoins: 14000, rarity: "legendary", emoji: "❄️", image: "/vehicles/veh_icechariot.png", gradient: "linear-gradient(135deg,#E0F2FE,#5ED4E8,#FFFFFF)" },
  { id: "veh_dragonmount", name: "Dragon Mount", priceCoins: 15000, rarity: "legendary", emoji: "🐲", image: "/vehicles/veh_dragonmount.png", gradient: "linear-gradient(135deg,#22C55E,#0EA5A5,#111827)" },
  { id: "veh_griffinmount", name: "Griffin Mount", priceCoins: 15500, rarity: "legendary", emoji: "🦅", image: "/vehicles/veh_griffinmount.png", gradient: "linear-gradient(135deg,#F5C34D,#FFFFFF,#8E97A8)" },
  { id: "veh_rocket", name: "Rocket Ship", priceCoins: 20000, rarity: "legendary", emoji: "🚀", image: "/vehicles/veh_rocket.png", gradient: "linear-gradient(135deg,#8B5CF6,#5ED4E8,#111827)" },

  // Mythic (SVIP-tier)
  { id: "veh_ufo", name: "UFO Cruiser", priceCoins: 25000, rarity: "mythic", emoji: "🛸", image: "/vehicles/veh_ufo.png", gradient: "linear-gradient(135deg,#39FF88,#8B5CF6,#0B0B12)" },
  { id: "veh_chariot", name: "Celestial Chariot", priceCoins: 28000, rarity: "mythic", emoji: "✨", image: "/vehicles/veh_chariot.png", gradient: "linear-gradient(135deg,#FFFFFF,#F5C34D,#FF8AB4)" },
  { id: "veh_phoenixflyer", name: "Phoenix Flyer", priceCoins: 30000, rarity: "mythic", emoji: "🔥", image: "/vehicles/veh_phoenixflyer.png", gradient: "linear-gradient(135deg,#FF3B7F,#FF8A3D,#F5C34D)" },
  { id: "veh_throne", name: "Throne of Kings", priceCoins: 35000, rarity: "mythic", emoji: "👑", image: "/vehicles/veh_throne.png", gradient: "linear-gradient(135deg,#8B5CF6,#FF3B7F,#F5C34D,#5ED4E8)" },
];

function catalogFor(type) {
  return type === "frame" ? FRAME_CATALOG : VEHICLE_CATALOG;
}
function ownedField(type) {
  return type === "frame" ? "ownedFrames" : "ownedVehicles";
}
function equippedField(type) {
  return type === "frame" ? "equippedFrame" : "equippedVehicle";
}

export function findItem(type, itemId) {
  return catalogFor(type).find((i) => i.id === itemId) || null;
}

/** Buys an item with coins (transaction on the user's own doc). Call equipDecoration after to wear it. */
export async function purchaseDecoration(uid, type, itemId) {
  const item = findItem(type, itemId);
  if (!item) throw new Error("Item not found");

  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Profile not found");
    const data = snap.data();
    const owned = data[ownedField(type)] || [];
    if (owned.includes(itemId)) return; // already owned — nothing to charge

    const coins = data.coins || 0;
    if (!item.free && coins < item.priceCoins) throw new Error("Not enough coins");

    tx.update(userRef, {
      [ownedField(type)]: [...owned, itemId],
      coins: item.free ? coins : coins - item.priceCoins,
    });
  });
}

/** Equips an already-owned (or free) item as the active frame/vehicle. */
export async function equipDecoration(uid, type, itemId) {
  const item = findItem(type, itemId);
  if (!item) throw new Error("Item not found");

  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Profile not found");
    const data = snap.data();
    const owned = data[ownedField(type)] || [];
    if (!item.free && !owned.includes(itemId)) throw new Error("You don't own this item yet");

    tx.update(userRef, { [equippedField(type)]: item.free ? null : itemId });
  });
}
