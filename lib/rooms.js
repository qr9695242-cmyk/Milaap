import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { PRIORITY_SEAT_INDEXES } from "./vip";
import { BACKGROUND_CATALOG } from "./backgrounds";

const SEAT_COUNT = 12;

export function emptySeats() {
  return Array.from({ length: SEAT_COUNT }, (_, i) => ({
    seatIndex: i,
    uid: null,
    name: null,
    muted: false,
    vipLevel: 0,
    frame: null,
  }));
}

/** Create a new room. type: "live" (video broadcast) or "audio" (12-seat room) */
export async function createRoom({ type, title, hostUid, hostName }) {
  const ref = await addDoc(collection(db, "rooms"), {
    type,
    title,
    hostUid,
    hostName,
    status: "live",
    viewerCount: 0,
    seats: type === "audio" ? emptySeats() : null,
    background: BACKGROUND_CATALOG[0].id,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Host-only: change the room's background (picked from BACKGROUND_CATALOG). */
export async function setRoomBackground(roomId, backgroundId) {
  await updateDoc(doc(db, "rooms", roomId), { background: backgroundId });
}

/**
 * Announce that someone just entered the room — "jaisi entry hoti hai"
 * (basic "X joined" for everyone, a flashier "rides in on ..." for
 * anyone with a vehicle equipped). Purely cosmetic: writes a short-lived
 * doc to rooms/{roomId}/entrances that EntranceBanner listens to and
 * animates across the whole screen.
 */
export async function announceEntrance(roomId, { uid, name, vehicleId, vehicleName, vehicleImage }) {
  const hasRide = vehicleId && vehicleId !== "veh_none";
  await addDoc(collection(db, "rooms", roomId, "entrances"), {
    uid,
    name,
    vehicleId: hasRide ? vehicleId : null,
    vehicleName: hasRide ? vehicleName : null,
    vehicleImage: hasRide ? vehicleImage || null : null,
    createdAt: serverTimestamp(),
  });
}

export function listenEntranceFeed(roomId, callback, max = 10) {
  const q = query(
    collection(db, "rooms", roomId, "entrances"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse());
  });
}

/** Subscribe to all currently-live rooms, newest first */
export function listenActiveRooms(callback, onError) {
  const q = query(
    collection(db, "rooms"),
    where("status", "==", "live"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      // Sabse aam wajah: Firestore composite index missing hai (status +
      // createdAt). Console mein poora error dekhein — Firebase khud ek
      // link deta hai jo ek click mein index bana deta hai.
      console.error("[listenActiveRooms] Firestore error:", err);
      if (onError) onError(err);
    }
  );
}

/** Subscribe to a single room's live document */
export function listenRoom(roomId, callback) {
  return onSnapshot(doc(db, "rooms", roomId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function endRoom(roomId) {
  await updateDoc(doc(db, "rooms", roomId), { status: "ended" });
}

export async function deleteRoomIfEmpty(roomId) {
  await deleteDoc(doc(db, "rooms", roomId));
}

/** Claim an empty seat atomically — prevents two people grabbing the same seat */
export async function takeSeat(roomId, seatIndex, uid, name, vipLevel = 0, frame = null) {
  const ref = doc(db, "rooms", roomId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Room not found");
    const seats = snap.data().seats || emptySeats();
    if (seats[seatIndex].uid) throw new Error("Seat already taken");
    // Remove this user from any other seat they might be in first
    const next = seats.map((s) =>
      s.uid === uid ? { ...s, uid: null, name: null, muted: false, vipLevel: 0, frame: null } : s
    );
    next[seatIndex] = { seatIndex, uid, name, muted: false, vipLevel, frame: frame || null };
    tx.update(ref, { seats: next });
  });
}

/**
 * TikTok/Bigo-style VIP perk: agar room ke saare seats bhare hon, VIP2+
 * user in mein se ek "priority seat" (front row — seats[0..1]) le sakta
 * hai, jismein us seat par baithe kisi non/lower-VIP guest ko seat se
 * hata diya jata hai (unke liye bas seat khali ho jati hai, room se
 * remove nahi hote). Agar priority seats bhi sab VIP-occupied hon (ya
 * caller khud VIP nahi hai), normal error throw hota hai.
 */
export async function takeSeatPriority(roomId, uid, name, vipLevel, frame = null) {
  const ref = doc(db, "rooms", roomId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Room not found");
    const seats = snap.data().seats || emptySeats();

    // Prefer a genuinely empty seat first (no need to bump anyone)
    const emptyIndex = seats.findIndex((s) => !s.uid);
    const cleared = seats.map((s) =>
      s.uid === uid ? { ...s, uid: null, name: null, muted: false, vipLevel: 0, frame: null } : s
    );

    if (emptyIndex !== -1) {
      cleared[emptyIndex] = { seatIndex: emptyIndex, uid, name, muted: false, vipLevel, frame: frame || null };
      tx.update(ref, { seats: cleared });
      return;
    }

    if (vipLevel < 2) throw new Error("Room is full");

    // Find a priority seat occupied by someone with a lower VIP level
    const bumpIndex = PRIORITY_SEAT_INDEXES.find(
      (i) => cleared[i].uid && cleared[i].uid !== uid && (cleared[i].vipLevel || 0) < vipLevel
    );
    if (bumpIndex === undefined) throw new Error("Room is full");

    cleared[bumpIndex] = { seatIndex: bumpIndex, uid, name, muted: false, vipLevel, frame: frame || null };
    tx.update(ref, { seats: cleared });
  });
}

export async function leaveSeat(roomId, seatIndex) {
  const ref = doc(db, "rooms", roomId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const seats = snap.data().seats || emptySeats();
    const next = [...seats];
    next[seatIndex] = { seatIndex, uid: null, name: null, muted: false, vipLevel: 0, frame: null };
    tx.update(ref, { seats: next });
  });
}

export async function toggleSeatMute(roomId, seatIndex, muted) {
  const ref = doc(db, "rooms", roomId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const seats = snap.data().seats || emptySeats();
    const next = [...seats];
    next[seatIndex] = { ...next[seatIndex], muted };
    tx.update(ref, { seats: next });
  });
}
