// Per-room presence heartbeat — lets a host see who's currently in the
// room (used e.g. by SeatActionSheet to pick who to bring onto a seat).
// Separate from the global lib/presence.js, which is account-wide, not
// room-scoped.

import {
 doc,
 setDoc,
 updateDoc,
 deleteDoc,
 deleteField,
 collection,
 onSnapshot,
 serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const HEARTBEAT_MS = 20_000;
const PRESENCE_THRESHOLD_MS = 40_000;

/** Call on mount for every user in the room. */
export function joinRoomPresence(roomId, uid, name) {
 if (!roomId || !uid) return () => {};
 const ref = doc(db, "rooms", roomId, "participants", uid);

 const beat = () => setDoc(ref, { name, lastActiveAt: serverTimestamp() }).catch(() => {});
 beat();
 const interval = setInterval(beat, HEARTBEAT_MS);

 return () => {
 clearInterval(interval);
 deleteDoc(ref).catch(() => {});
 };
}

export function listenParticipants(roomId, callback) {
 return onSnapshot(collection(db, "rooms", roomId, "participants"), (snap) => {
 const now = Date.now();
 callback(
 snap.docs
 .map((d) => ({ uid: d.id, ...d.data() }))
 .filter((p) => {
 const ms = p.lastActiveAt?.toMillis ? p.lastActiveAt.toMillis() : 0;
 return now - ms < PRESENCE_THRESHOLD_MS;
 })
 );
 });
}

/** Host sends a co-host invite to another participant in the room. */
export async function inviteCoHost(roomId, uid, name) {
 if (!roomId || !uid) return;
 await updateDoc(doc(db, "rooms", roomId), {
 coHostInvite: { uid, name: name || null },
 });
}

/** Host removes the current co-host (or cancels a pending invite). */
export async function removeCoHost(roomId) {
 if (!roomId) return;
 await updateDoc(doc(db, "rooms", roomId), {
 coHostUid: deleteField(),
 coHostName: deleteField(),
 coHostInvite: deleteField(),
 });
}

/** Invited participant accepts — they become the co-host. */
export async function acceptCoHostInvite(roomId, uid, name) {
 if (!roomId || !uid) return;
 await updateDoc(doc(db, "rooms", roomId), {
 coHostUid: uid,
 coHostName: name || null,
 coHostInvite: deleteField(),
 });
}

/** Invited participant declines — invite is cleared, no co-host set. */
export async function declineCoHostInvite(roomId) {
 if (!roomId) return;
 await updateDoc(doc(db, "rooms", roomId), {
 coHostInvite: deleteField(),
 });
}

