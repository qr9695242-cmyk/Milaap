import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/** Top diamond earners (hosts who received the most gifts) */
export function listenTopEarners(callback, max = 20) {
 const q = query(collection(db, "users"), orderBy("diamonds", "desc"), limit(max));
 return onSnapshot(q, (snap) => {
 callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
 });
}

/** Top spenders (viewers who recharged the most, lifetime) */
export function listenTopSpenders(callback, max = 20) {
 const q = query(collection(db, "users"), orderBy("totalRechargedRs", "desc"), limit(max));
 return onSnapshot(q, (snap) => {
 callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
 });
}


/** Top family by the real family total recorded in Firestore. */
export function listenTopFamily(callback) {
 const q = query(collection(db, "families"), orderBy("totalDiamonds", "desc"), limit(1));
 return onSnapshot(q, (snap) => {
 callback(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
 });
}

/** Top CP pair: the oldest active pair (longest real time together). */
export function listenTopCpPair(callback) {
 const q = query(collection(db, "cpPairs"), orderBy("startedAt", "asc"), limit(1));
 return onSnapshot(q, (snap) => {
 callback(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
 });
}
