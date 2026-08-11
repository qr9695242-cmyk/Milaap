// ⚠️ MVP note: coins/diamonds yahan directly client se update ho rahe hain.
// Testing ke liye theek hai, lekin production launch se pehle ye logic
// ek Cloud Function mein move karna chahiye (client sirf request bheje,
// trusted server hi balance update kare) — warna koi bhi apna balance
// khud badal sakta hai agar Firestore SDK directly call kare.
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
  { id: "rose", name: "Rose", icon: "🌹", cost: 10 },
  { id: "heart", name: "Heart", icon: "❤️", cost: 50 },
  { id: "ring", name: "Ring", icon: "💍", cost: 200 },
  { id: "crown", name: "Crown", icon: "👑", cost: 500 },
  { id: "car", name: "Sports Car", icon: "🏎️", cost: 5000 },
  { id: "rocket", name: "Rocket", icon: "🚀", cost: 10000 },
];

/**
 * Send a gift: atomically deducts coins from sender and credits
 * diamonds to the receiver (usually the room host), then logs it
 * to the room's live gift feed.
 */
export async function sendGift(roomId, { fromUid, fromName, toUid, toName, gift }) {
  await runTransaction(db, async (tx) => {
    const senderRef = doc(db, "users", fromUid);
    const senderSnap = await tx.get(senderRef);
    if (!senderSnap.exists()) throw new Error("Sender profile not found");

    const senderCoins = senderSnap.data().coins || 0;
    if (senderCoins < gift.cost) throw new Error("Not enough coins");

    tx.update(senderRef, { coins: senderCoins - gift.cost });

    if (toUid && toUid !== fromUid) {
      const receiverRef = doc(db, "users", toUid);
      const receiverSnap = await tx.get(receiverRef);
      if (receiverSnap.exists()) {
        // TikTok-style cut: platform keeps ~50%, host gets the rest as diamonds.
        const diamondsEarned = Math.floor(gift.cost * GIFT_DIAMOND_RATE);
        const receiverDiamonds = receiverSnap.data().diamonds || 0;
        tx.update(receiverRef, { diamonds: receiverDiamonds + diamondsEarned });
      }
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
