// ROOM MATCH: COINS ONLY — entry stake and winnings stay in Coins; never convert to Diamonds.
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
import { PRIORITY_SEAT_INDEXES, MIN_PRIORITY_VIP_LEVEL } from "./vip";
import { BACKGROUND_CATALOG } from "./backgrounds";

const SEAT_COUNT = 12;

// Seat layout options offered at room-creation time.
// "6" = 6-seat party room, "1" = 1-seat (1-on-1 host-only) room.
export const SEAT_LAYOUTS = {
 6: { count: 6, label: "6 Seats", cols: 3 },
 1: { count: 1, label: "1 Seat (1-on-1)", cols: 1 },
};

export function emptySeats(count = SEAT_COUNT) {
 return Array.from({ length: count }, (_, i) => ({
 seatIndex: i,
 uid: null,
 name: null,
 muted: false,
 vipLevel: 0,
 frame: null,
 locked: false,
 }));
}

/**
 * Create a new room. type: "live" (video broadcast) or "audio" (seated room).
 * seatLayout: 6 (6-seat party room) or 1 (1-on-1 room). Defaults to 6.
 */
export async function createRoom({ type, title, hostUid, hostName, seatLayout = 6 }) {
 const layout = SEAT_LAYOUTS[seatLayout] || SEAT_LAYOUTS[6];
 const ref = await addDoc(collection(db, "rooms"), {
 type,
 title,
 hostUid,
 hostName,
 status: "live",
 viewerCount: 0,
 seatLayout: layout.count,
 seats: type === "audio" ? emptySeats(layout.count) : null,
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
export async function announceEntrance(roomId, { uid, name, avatar, vehicleId, vehicleName, vehicleImage, vehicleVideo }) {
 const hasRide = vehicleId && vehicleId !== "veh_none";
 await addDoc(collection(db, "rooms", roomId, "entrances"), {
 uid,
 name,
 avatar: avatar || null,
 vehicleId: hasRide ? vehicleId : null,
 vehicleName: hasRide ? vehicleName : null,
 vehicleImage: hasRide ? vehicleImage || null : null,
 vehicleVideo: hasRide ? vehicleVideo || null : null,
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

/**
 * Room Match: pick a random *other* currently-live audio room, for the
 * swipe-to-next-room flow (swipe up in a room → jump into a fresh one).
 * One-time read (not a listener) since this only runs at swipe time.
 * Returns null if there's no other live room to jump to.
 */
export async function pickRandomOtherRoom(excludeRoomId, type = "audio") {
 const { getDocs } = await import("firebase/firestore");
 const q = query(
 collection(db, "rooms"),
 where("status", "==", "live"),
 where("type", "==", type),
 limit(25)
 );
 const snap = await getDocs(q);
 const candidates = snap.docs.filter((d) => d.id !== excludeRoomId);
 if (candidates.length === 0) return null;
 const pick = candidates[Math.floor(Math.random() * candidates.length)];
 return pick.id;
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
 if (seats[seatIndex].locked) throw new Error("Seat is locked");
 // Remove this user from any other seat they might be in first
 const next = seats.map((s) =>
 s.uid === uid ? { ...s, uid: null, name: null, muted: false, vipLevel: 0, frame: null } : s
 );
 next[seatIndex] = { ...next[seatIndex], seatIndex, uid, name, muted: false, vipLevel, frame: frame || null };
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

 if (vipLevel < MIN_PRIORITY_VIP_LEVEL) throw new Error("Room is full");

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
 next[seatIndex] = {
 seatIndex,
 uid: null,
 name: null,
 muted: false,
 vipLevel: 0,
 frame: null,
 locked: seats[seatIndex]?.locked || false,
 };
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

/** Host-only: lock or unlock a single seat so no one can sit in it while locked. */
export async function toggleSeatLock(roomId, seatIndex, locked) {
 const ref = doc(db, "rooms", roomId);
 await runTransaction(db, async (tx) => {
 const snap = await tx.get(ref);
 if (!snap.exists()) return;
 const seats = snap.data().seats || emptySeats();
 const next = [...seats];
 next[seatIndex] = { ...next[seatIndex], locked };
 tx.update(ref, { seats: next });
 });
}

/** Host-only: lock or unlock every seat in the room at once. */
export async function toggleAllSeatsLock(roomId, locked) {
 const ref = doc(db, "rooms", roomId);
 await runTransaction(db, async (tx) => {
 const snap = await tx.get(ref);
 if (!snap.exists()) return;
 const seats = snap.data().seats || emptySeats();
 const next = seats.map((s) => ({ ...s, locked }));
 tx.update(ref, { seats: next });
 });
}

/** Host-only: remove whoever is sitting in a seat (they stay in the room, just off mic). */
export async function removeFromSeat(roomId, seatIndex) {
 return leaveSeat(roomId, seatIndex);
}
