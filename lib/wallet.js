import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { vipLevelForSpend } from "./vip";
import {
  MIN_EXCHANGE_DIAMONDS,
} from "./config";
import { notifyAdmins } from "./notifications";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

// Rs 1,000 se Rs 40,000 tak — 5 packages, coins Rs ke sath proportional
// badhte hain aur bade pack par zyada % bonus milta hai.
export const RECHARGE_PACKAGES = [
  { id: "p1", coins: 3200000, bonusCoins: 320000, priceRs: 1000 },
  { id: "p2", coins: 16000000, bonusCoins: 2000000, priceRs: 5000 },
  { id: "p3", coins: 38400000, bonusCoins: 5800000, priceRs: 12000 },
  { id: "p4", coins: 80000000, bonusCoins: 13600000, priceRs: 25000 },
  { id: "p5", coins: 128000000, bonusCoins: 24000000, priceRs: 40000 },
];

/** Submit a recharge request — sits as "pending" until admin approves it (Phase 4 admin panel). */
export async function submitRechargeRequest({ uid, name, pkg, method, reference }) {
  if (!reference || !reference.trim()) {
    throw new Error("Transaction ID zaroori hai.");
  }
  const totalCoins = pkg.coins + (pkg.bonusCoins || 0);
  await addDoc(collection(db, "rechargeRequests"), {
    uid,
    name,
    packageId: pkg.id,
    coins: totalCoins,
    baseCoins: pkg.coins,
    bonusCoins: pkg.bonusCoins || 0,
    priceRs: pkg.priceRs,
    method,
    reference: reference || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });

  // Notification background mein bhejte hain — agar ye slow ho ya fail ho
  // jaye to bhi recharge request submit hone se nahi rukni chahiye.
  notifyAdmins({
    title: "New recharge request",
    body: `${name} ne ${totalCoins} coins (Rs ${pkg.priceRs}) ke liye payment bheji hai — approve karein.`,
    link: "/admin",
  }).catch((err) => console.error("notifyAdmins failed:", err));
}

export function listenMyRecharges(uid, callback) {
  const q = query(
    collection(db, "rechargeRequests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function listenPendingRecharges(callback, onError) {
  const q = query(
    collection(db, "rechargeRequests"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      console.error("[listenPendingRecharges] Firestore error:", err);
      if (onError) onError(err);
    }
  );
}

/** Admin-only (enforced by Firestore rules via ADMIN_EMAILS): credits coins + recomputes VIP tier. */
export async function approveRecharge(request) {
  if (!request.reference || !String(request.reference).trim()) {
    throw new Error("Transaction ID ke bagair approve nahi kar sakte.");
  }
  const reqRef = doc(db, "rechargeRequests", request.id);
  const userRef = doc(db, "users", request.uid);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("User not found");
    const data = userSnap.data();
    const newCoins = (data.coins || 0) + request.coins;
    const newTotalSpend = (data.totalRechargedRs || 0) + request.priceRs;
    tx.update(userRef, {
      coins: newCoins,
      totalRechargedRs: newTotalSpend,
      vipLevel: vipLevelForSpend(newTotalSpend).level,
    });
    tx.update(reqRef, { status: "approved" });
  });
}

export async function rejectRecharge(requestId) {
  await updateDoc(doc(db, "rechargeRequests", requestId), { status: "rejected" });
}

export async function exchangeDiamondsToCoins(uid, diamonds) {
  const value = Math.floor(Number(diamonds));
  if (!value || value < MIN_EXCHANGE_DIAMONDS) {
    throw new Error(`Minimum exchange ${MIN_EXCHANGE_DIAMONDS} diamonds hai.`);
  }
  const fn = httpsCallable(getFunctions(app), "exchangeDiamonds");
  const result = await fn({ diamonds: value });
  return { coinsGained: Number(result.data?.coinsGained || 0) };
}
