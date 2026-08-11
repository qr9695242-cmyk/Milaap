import {
  collection,
  addDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { GIFT_DIAMOND_RATE } from "./config";

export const GIFT_CATALOG = [
  { id: "rose", name: "Rose", icon: "🌹", cost: 80 },
  { id: "heart", name: "Heart", icon: "❤️", cost: 400 },
  { id: "ring", name: "Ring", icon: "💍", cost: 1600 },
  { id: "crown", name: "Crown", icon: "👑", cost: 4000 },
  { id: "car", name: "Sports Car", icon: "🏎️", cost: 40000 },
  { id: "rocket", name: "Rocket", icon: "🚀", cost: 80000 },
  { id: "diamond", name: "Diamond Rain", icon: "💎", cost: 160000 },
  { id: "castle", name: "Royal Castle", icon: "🏰", cost: 400000 },
  { id: "dragon", name: "Golden Dragon", icon: "🐉", cost: 800000 },
  { id: "phoenix", name: "Phoenix", icon: "🔥", cost: 1200000 },
  { id: "yacht", name: "Luxury Yacht", icon: "🛥️", cost: 1600000 },
  { id: "jet", name: "Private Jet", icon: "✈️", cost: 2400000 },
  { id: "galaxy", name: "Galaxy", icon: "🌌", cost: 3200000 },
  { id: "unicorn", name: "Unicorn", icon: "🦄", cost: 4000000 },
  { id: "throne", name: "Royal Throne", icon: "👑", cost: 5000000 },
  { id: "world", name: "Wonder World", icon: "🌍", cost: 6500000 },
  { id: "king", name: "Kingdom", icon: "🏯", cost: 8000000 },
  { id: "legend", name: "Legendary Crown", icon: "🤴", cost: 10000000 },
];

/**
 * Send a gift: atomically deducts coins from sender and credits
 * diamonds to the receiver (usually the room host), then logs it
 * to the room's live gift feed.
 */
export async function sendGift(roomId, { fromUid, fromName, toUid, toName, gift }) {
  await runTransaction(db, async (tx) => {
    const senderRef = doc(db, "users", fromUid);
    const receiverRef = toUid && toUid !== fromUid ? doc(db, "users", toUid) : null;

    // Firestore transactions require ALL reads to happen before ANY writes —
    // so both docs are read first, then both are written, instead of the
    // previous read→write→read→write interleaving that Firestore rejects.
    const senderSnap = await tx.get(senderRef);
    if (!senderSnap.exists()) throw new Error("Sender profile not found");
    const receiverSnap = receiverRef ? await tx.get(receiverRef) : null;

    const senderCoins = senderSnap.data().coins || 0;
    if (senderCoins < gift.cost) throw new Error("Not enough coins");

    // Lifetime gifted total drives the Gift Level ladder (lib/giftLevel.js),
    // same shortcut lib/vip.js takes with totalRechargedRs — nothing spends
    // this counter back down, so it stays a true lifetime total.
    const totalCoinsGifted = (senderSnap.data().totalCoinsGifted || 0) + gift.cost;
    tx.update(senderRef, { coins: senderCoins - gift.cost, totalCoinsGifted });

    if (receiverSnap?.exists()) {
      // TikTok-style cut: platform keeps ~50%, host gets the rest as diamonds.
      const diamondsEarned = Math.floor(gift.cost * GIFT_DIAMOND_RATE);
      const receiverDiamonds = receiverSnap.data().diamonds || 0;
      tx.update(receiverRef, { diamonds: receiverDiamonds + diamondsEarned });
    }
  });

  await addDoc(collection(db, "rooms", roomId, "gifts"), {
    fromUid,
    fromName,
    toUid,
    toName,
    giftId: gift.id,
    giftName: gift.name,
    giftIcon: gift.icon,
    cost: gift.cost,
    createdAt: serverTimestamp(),
  });
}

export function listenGiftFeed(roomId, callback, max = 15) {
  const q = query(
    collection(db, "rooms", roomId, "gifts"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse());
  });
}
