import { collection, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { MILAAP_ECONOMY } from "./config";

export const RUPEES_PER_DIAMOND = MILAAP_ECONOMY.rupeesPerDiamond || 1;

export async function getRupeesPerDiamond() {
 const snap = await getDoc(doc(db, "config", "diamondSettings"));
 const value = Number(snap.data()?.rupeesPerDiamond);
 return value > 0 ? value : RUPEES_PER_DIAMOND;
}

export async function createWithdrawalRequest({ uid, name, method, account, diamonds }) {
  if (!uid) throw new Error("Login required.");
  const amount = Math.floor(Number(diamonds));
  if (!Number.isFinite(amount) || amount < 1) throw new Error("Enter at least 1 Diamond.");
  if (!name?.trim() || !account?.trim()) throw new Error("Account name and account number are required.");
  if (!["JazzCash", "Easypaisa", "Bank"].includes(method)) throw new Error("Invalid withdrawal method.");

  const userRef = doc(db, "users", uid);
  const requestRef = doc(collection(db, "withdrawalRequests"));

  const rupeesPerDiamond = await getRupeesPerDiamond();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("User profile not found.");
    const currentDiamonds = Math.floor(Number(snap.data()?.diamonds || 0));
    if (amount > currentDiamonds) {
      throw new Error(`Insufficient Diamonds. Available: ${currentDiamonds.toLocaleString()}.`);
    }

    tx.update(userRef, { diamonds: currentDiamonds - amount });
    tx.set(requestRef, {
      uid,
      name: name.trim(),
      method,
      account: account.trim(),
      diamonds: amount,
      cashValue: amount * rupeesPerDiamond,
      status: "pending",
      rupeesPerDiamond,
      createdAt: serverTimestamp(),
    });
  });

  return requestRef.id;
}
