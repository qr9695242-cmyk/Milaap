import {
  collection,
  addDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

export function familyLevelForDiamonds(totalDiamonds = 0) {
  if (totalDiamonds >= 200000) return 5;
  if (totalDiamonds >= 50000) return 4;
  if (totalDiamonds >= 10000) return 3;
  if (totalDiamonds >= 2000) return 2;
  return 1;
}

export async function createFamily({ name, leaderId, leaderName }) {
  const ref = await addDoc(collection(db, "families"), {
    name,
    leaderId,
    leaderName,
    members: [{ uid: leaderId, name: leaderName }],
    totalDiamonds: 0,
    level: 1,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", leaderId), { familyId: ref.id });
  return ref.id;
}

export function listenFamilyLeaderboard(callback, max = 30) {
  const q = query(collection(db, "families"), orderBy("totalDiamonds", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function listenFamily(familyId, callback) {
  return onSnapshot(doc(db, "families", familyId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function joinFamily(familyId, uid, name) {
  await updateDoc(doc(db, "families", familyId), {
    members: arrayUnion({ uid, name }),
  });
  await updateDoc(doc(db, "users", uid), { familyId });
}

export async function leaveFamily(familyId, member) {
  await updateDoc(doc(db, "families", familyId), {
    members: arrayRemove(member),
  });
  await updateDoc(doc(db, "users", member.uid), { familyId: null });
}

/** Member spends their own diamonds to boost the family's total (and level). */
export async function contributeToFamily(familyId, uid, amount) {
  const userRef = doc(db, "users", uid);
  const familyRef = doc(db, "families", familyId);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const familySnap = await tx.get(familyRef);
    if (!userSnap.exists() || !familySnap.exists()) throw new Error("Not found");

    const myDiamonds = userSnap.data().diamonds || 0;
    if (myDiamonds < amount) throw new Error("Not enough diamonds");

    const newTotal = (familySnap.data().totalDiamonds || 0) + amount;
    tx.update(userRef, { diamonds: myDiamonds - amount });
    tx.update(familyRef, {
      totalDiamonds: newTotal,
      level: familyLevelForDiamonds(newTotal),
    });
  });
}
