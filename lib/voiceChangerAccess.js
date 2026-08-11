import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Voice effects unlock permanently for the user. Prices deliberately start at
// 400,000 coins and rise step-by-step for stronger effects.
export const VOICE_UNLOCKS = {
  original: { price: 0, label: "Original" },
  deep: { price: 400000, label: "Deep" },
  chipmunk: { price: 800000, label: "Chipmunk" },
  robot: { price: 1200000, label: "Robot" },
  cave: { price: 1600000, label: "Cave" },
};

export async function purchaseVoicePreset(uid, presetId) {
  const item = VOICE_UNLOCKS[presetId];
  if (!item || item.price <= 0) return;
  const ref = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("User not found");
    const data = snap.data();
    const unlocked = Array.isArray(data.voiceChangerUnlocked) ? data.voiceChangerUnlocked : ["original"];
    if (unlocked.includes(presetId)) return;
    const coins = Number(data.coins || 0);
    if (coins < item.price) throw new Error(`Need ${item.price.toLocaleString()} coins to unlock ${item.label}.`);
    tx.update(ref, {
      coins: coins - item.price,
      voiceChangerUnlocked: [...new Set([...unlocked, presetId])],
      voiceChangerLastPurchaseAt: serverTimestamp(),
    });
  });
}
