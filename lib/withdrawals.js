import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { DIAMOND_CASH_RUPEES, MIN_WITHDRAWAL_DIAMONDS } from "./config";
import { notifyAdmins } from "./notifications";

export { DIAMOND_CASH_RUPEES, MIN_WITHDRAWAL_DIAMONDS };

export async function submitWithdrawalRequest({ uid, name, diamonds, method, account, accountName }) {
  const cleanDiamonds = Math.floor(Number(diamonds));
  const cleanAccount = String(account || "").trim();
  const cleanName = String(accountName || name || "").trim();
  if (!Number.isFinite(cleanDiamonds) || cleanDiamonds < MIN_WITHDRAWAL_DIAMONDS) {
    throw new Error(`Minimum withdrawal ${MIN_WITHDRAWAL_DIAMONDS.toLocaleString()} Diamonds hai.`);
  }
  if (!cleanAccount || !cleanName) throw new Error("Account name aur account number zaroori hai.");
  if (!["JazzCash", "Easypaisa", "Bank"].includes(method)) throw new Error("Invalid withdrawal method.");

  const ref = await addDoc(collection(db, "withdrawalRequests"), {
    uid,
    name: cleanName,
    diamonds: cleanDiamonds,
    method,
    account: cleanAccount,
    accountName: cleanName,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  notifyAdmins({
    title: "New withdrawal request",
    body: `${cleanName} ne ${cleanDiamonds.toLocaleString()} Diamonds withdrawal request bheji hai — ${method} ${cleanAccount}`,
    link: "/admin",
  }).catch(() => {});

  return ref.id;
}

export function listenMyWithdrawals(uid, callback, onError) {
  const q = query(
    collection(db, "withdrawalRequests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export function listenPendingWithdrawals(callback, onError) {
  const q = query(
    collection(db, "withdrawalRequests"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export async function rejectWithdrawal(requestId) {
  await updateDoc(doc(db, "withdrawalRequests", requestId), {
    status: "rejected",
    reviewedAt: serverTimestamp(),
  });
}

export async function approveWithdrawal(request) {
  const requestRef = doc(db, "withdrawalRequests", request.id);
  const userRef = doc(db, "users", request.uid);
  await runTransaction(db, async (tx) => {
    const [requestSnap, userSnap] = await Promise.all([tx.get(requestRef), tx.get(userRef)]);
    if (!requestSnap.exists()) throw new Error("Withdrawal request not found.");
    if (!userSnap.exists()) throw new Error("User not found.");
    if (requestSnap.data().status !== "pending") throw new Error("This request is already processed.");
    const currentDiamonds = Number(userSnap.data().diamonds || 0);
    const diamonds = Math.floor(Number(requestSnap.data().diamonds || 0));
    if (currentDiamonds < diamonds) throw new Error("User ke paas required Diamonds nahi hain.");
    tx.update(userRef, { diamonds: currentDiamonds - diamonds });
    tx.update(requestRef, {
      status: "approved",
      reviewedAt: serverTimestamp(),
      payoutRs: diamonds * DIAMOND_CASH_RUPEES,
    });
  });
}
