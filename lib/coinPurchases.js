// Coin purchase request + admin release flow. Creating a "pending" doc here
// is what triggers notifyAdminOnCoinPurchase in functions/index.js.
// Adjust the wallet-credit step (walletRef) to match your real coin field.

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const PURCHASES = "coin_purchases";

export async function requestCoinPurchase({ uid, coins, amount }) {
  const ref = await addDoc(collection(db, PURCHASES), {
    uid,
    coins,
    amount,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Admin-only: call from your admin panel after verifying payment.
export async function releaseCoinPurchase(purchaseId, purchase) {
  await updateDoc(doc(db, "users", purchase.uid), {
    coins: increment(purchase.coins),
  });
  await updateDoc(doc(db, PURCHASES, purchaseId), {
    status: "released",
    releasedAt: serverTimestamp(),
  });
}

export async function rejectCoinPurchase(purchaseId) {
  await updateDoc(doc(db, PURCHASES, purchaseId), { status: "rejected" });
}

// For the admin panel: live list of purchases waiting to be released.
export function listenPendingCoinPurchases(callback) {
  const q = query(collection(db, PURCHASES), where("status", "==", "pending"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
