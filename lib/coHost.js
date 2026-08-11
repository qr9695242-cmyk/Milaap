// "Add guest to video call" — lets the host bring one viewer on-screen
// alongside them (duet/PK style: host + 1 co-host, both publish camera).
//
// Needs to know who's currently in the room to invite, so this also owns
// a lightweight per-room presence heartbeat (separate from the global
// lib/presence.js, which is account-wide, not room-scoped).

import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const HEARTBEAT_MS = 20_000;
const PRESENCE_THRESHOLD_MS = 40_000;

/** Call on mount for every user in the room (host, co-host, viewers). */
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

/** Host invites a viewer to join the video as co-host. */
export async function inviteCoHost(roomId, uid, name) {
  await updateDoc(doc(db, "rooms", roomId), {
    coHostInvite: { uid, name, status: "pending", at: serverTimestamp() },
  });
}

/** Invited viewer accepts — becomes co-host, starts publishing camera/mic. */
export async function acceptCoHostInvite(roomId, uid, name) {
  await updateDoc(doc(db, "rooms", roomId), {
    coHostUid: uid,
    coHostName: name,
    coHostInvite: deleteField(),
  });
}

export async function declineCoHostInvite(roomId) {
  await updateDoc(doc(db, "rooms", roomId), { coHostInvite: deleteField() });
}

/** Host removes the current guest, or the guest leaves the video themself. */
export async function removeCoHost(roomId) {
  await updateDoc(doc(db, "rooms", roomId), {
    coHostUid: deleteField(),
    coHostName: deleteField(),
  });
}
