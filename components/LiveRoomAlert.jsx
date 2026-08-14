"use client";

// Jab bhi koi naya room live jaata hai, har user ke Home screen par turant
// ek chhota "🔴 X just went live" toast dikhata hai — bina har user ke
// notifications/{uid}/items mein alag se likhe (jo scale nahi karta agar
// users zyada hon). Ye sirf rooms collection ka existing onSnapshot
// listener use karta hai aur docChanges() se batata hai ke koi NAYA room
// abhi-abhi "live" hua — Firestore ki taraf se sab connected users ko
// khud-ba-khud real-time mil jaata hai, koi extra likhai nahi honi
// padti.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TOAST_MS = 5000;

export default function LiveRoomAlert() {
 const router = useRouter();
 const [toasts, setToasts] = useState([]);
 const mountedAt = useRef(Date.now());
 const seen = useRef(new Set());

 useEffect(() => {
 const q = query(collection(db, "rooms"), where("status", "==", "live"));
 const unsub = onSnapshot(q, (snap) => {
 snap.docChanges().forEach((change) => {
 if (change.type !== "added") return;
 const room = { id: change.doc.id, ...change.doc.data() };
 // Ignore rooms that were already live before this component
 // mounted (docChanges() fires "added" for the whole initial
 // snapshot too) and don't double-toast the same room.
 const createdMs = room.createdAt?.toDate?.().getTime?.() ?? 0;
 if (createdMs && createdMs < mountedAt.current) return;
 if (seen.current.has(room.id)) return;
 seen.current.add(room.id);

 setToasts((prev) => [...prev, room]);
 setTimeout(() => {
 setToasts((prev) => prev.filter((r) => r.id !== room.id));
 }, TOAST_MS);
 });
 });
 return unsub;
 }, []);

 if (toasts.length === 0) return null;

 return (
 <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
 {toasts.map((room) => (
 <button
 key={room.id}
 onClick={() => router.push(`/audio-room/${room.id}`)}
 className="premium-card pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl p-3 shadow-glow"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-lg">
 🔴
 </span>
 <span className="min-w-0 flex-1 text-left">
 <span className="block truncate text-xs font-bold text-ink">
 {room.hostName || "Someone"} is live now!
 </span>
 <span className="block truncate text-[11px] text-mist">{room.title}</span>
 </span>
 <span className="shrink-0 rounded-full bg-glow-gradient px-3 py-1.5 text-[10px] font-bold text-ink">
 Join
 </span>
 </button>
 ))}
 </div>
 );
}
