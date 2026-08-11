// Agency Panel — an agency leader recruits hosts; hosts join with a short
// code. Members list + their diamond totals let a leader see who's earning
// (real payout/commission logic is a later, backend-trusted phase, same
// caveat as lib/wallet.js and lib/gifts.js).
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Creates a new agency with the current user as leader, returns its id. */
export async function createAgency(leaderUid, leaderName, name) {
  const ref = await addDoc(collection(db, "agencies"), {
    name,
    code: randomCode(),
    leaderId: leaderUid,
    leaderName,
    memberCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Host joins an agency by its 6-char code — sets agencyId on their own user doc. */
export async function joinAgencyByCode(uid, code) {
  const q = query(collection(db, "agencies"), where("code", "==", code.toUpperCase().trim()));
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid agency code");
  const agencyDoc = snap.docs[0];

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", uid);
    const agencyRef = doc(db, "agencies", agencyDoc.id);
    const agencySnap = await tx.get(agencyRef);
    tx.update(userRef, { agencyId: agencyDoc.id, agencyName: agencyDoc.data().name });
    tx.update(agencyRef, { memberCount: (agencySnap.data().memberCount || 0) + 1 });
  });

  return agencyDoc.id;
}

export async function leaveAgency(uid, agencyId) {
  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", uid);
    const agencyRef = doc(db, "agencies", agencyId);
    const agencySnap = await tx.get(agencyRef);
    tx.update(userRef, { agencyId: null, agencyName: null });
    if (agencySnap.exists()) {
      tx.update(agencyRef, { memberCount: Math.max(0, (agencySnap.data().memberCount || 0) - 1) });
    }
  });
}

export function listenAgency(agencyId, callback) {
  return onSnapshot(doc(db, "agencies", agencyId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/** Members of an agency, ranked by diamonds earned (highest first). */
export function listenAgencyMembers(agencyId, callback) {
  const q = query(
    collection(db, "users"),
    where("agencyId", "==", agencyId),
    orderBy("diamonds", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
