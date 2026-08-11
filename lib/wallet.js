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
  DIAMOND_WITHDRAW_RATE_RS,
  MIN_WITHDRAW_DIAMONDS,
  DIAMOND_TO_COIN_RATE,
  MIN_EXCHANGE_DIAMONDS,
} from "./config";
import { notifyAdmins } from "./notifications";

export const RECHARGE_PACKAGES = [
  { id: "p1", coins: 100, priceRs: 150 },
  { id: "p2", coins: 550, priceRs: 750 },
  { id: "p3", coins: 1200, priceRs: 1500 },
  { id: "p4", coins: 3000, priceRs: 3500 },
  { id: "p5", coins: 6500, priceRs: 7500 },
  { id: "p6", coins: 14000, priceRs: 15000 },
];

/** Submit a recharge request — sits as "pending" until admin approves it (Phase 4 admin panel). */
export async function submitRechargeRequest({ uid, name, pkg, method, reference }) {
  await addDoc(collection(db, "rechargeRequests"), {
    uid,
    name,
    packageId: pkg.id,
    coins: pkg.coins,
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
    body: `${name} ne ${pkg.coins} coins (Rs ${pkg.priceRs}) ke liye payment bheji hai — approve karein.`,
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

// ── Diamond Withdraw (host cashout) ─────────────────────────────────
// TikTok jaisa hi flow: host apni earned diamonds cash karne ke liye
// request bhejta hai (JazzCash/Easypaisa number ke saath), diamonds
// turant deduct ho jaati hain (locked) taake dobara withdraw na ho
// sake, admin approve kare to payment bhej ke "paid" mark kar deta hai.
export function diamondsToRs(diamonds) {
  return Math.floor(diamonds * DIAMOND_WITHDRAW_RATE_RS);
}

export async function submitWithdrawRequest({ uid, name, diamonds, method, accountNumber }) {
  if (diamonds < MIN_WITHDRAW_DIAMONDS) {
    throw new Error(`Minimum withdraw ${MIN_WITHDRAW_DIAMONDS} diamonds hai.`);
  }
  const payoutRs = diamondsToRs(diamonds);
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("User not found");
    const currentDiamonds = userSnap.data().diamonds || 0;
    if (currentDiamonds < diamonds) throw new Error("Not enough diamonds");
    tx.update(userRef, { diamonds: currentDiamonds - diamonds });
    tx.set(doc(collection(db, "withdrawRequests")), {
      uid,
      name,
      diamonds,
      payoutRs,
      method,
      accountNumber,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });

  await notifyAdmins({
    title: "New withdraw request",
    body: `${name} ne ${diamonds} diamonds (Rs ${payoutRs}) cash karne ke liye request bheji hai.`,
    link: "/admin",
  }).catch((err) => console.error("notifyAdmins failed:", err));
}

export function listenMyWithdrawals(uid, callback) {
  const q = query(
    collection(db, "withdrawRequests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function listenPendingWithdrawals(callback, onError) {
  const q = query(
    collection(db, "withdrawRequests"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      console.error("[listenPendingWithdrawals] Firestore error:", err);
      if (onError) onError(err);
    }
  );
}

/** Admin-only: mark as paid after sending money via JazzCash/Easypaisa manually. */
export async function approveWithdraw(requestId) {
  await updateDoc(doc(db, "withdrawRequests", requestId), { status: "paid" });
}

// ── Diamond → Coin exchange ─────────────────────────────────────────
// Purely internal (no real money involved), so unlike recharge/withdraw
// this applies instantly — no admin approval needed.
export function diamondsToCoins(diamonds) {
  return Math.floor(diamonds * DIAMOND_TO_COIN_RATE);
}

export async function exchangeDiamondsToCoins(uid, diamonds) {
  if (diamonds < MIN_EXCHANGE_DIAMONDS) {
    throw new Error(`Minimum exchange ${MIN_EXCHANGE_DIAMONDS} diamonds hai.`);
  }
  const coinsGained = diamondsToCoins(diamonds);
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("User not found");
    const data = snap.data();
    const currentDiamonds = data.diamonds || 0;
    if (currentDiamonds < diamonds) throw new Error("Not enough diamonds");
    tx.update(userRef, {
      diamonds: currentDiamonds - diamonds,
      coins: (data.coins || 0) + coinsGained,
    });
  });

  return { coinsGained };
}

/** Admin-only: reject and refund the diamonds back to the host. */
export async function rejectWithdraw(request) {
  const reqRef = doc(db, "withdrawRequests", request.id);
  const userRef = doc(db, "users", request.uid);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      const currentDiamonds = userSnap.data().diamonds || 0;
      tx.update(userRef, { diamonds: currentDiamonds + request.diamonds });
    }
    tx.update(reqRef, { status: "rejected" });
  });
}
