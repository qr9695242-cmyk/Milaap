import {
  collection,
  addDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";

const BATTLE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

/** Host A challenges Host B — both must currently be live-streaming. */
export async function startPkBattle({ roomAId, hostAId, hostAName, roomBId, hostBId, hostBName }) {
  const ref = await addDoc(collection(db, "pkBattles"), {
    roomAId,
    hostAId,
    hostAName,
    roomBId,
    hostBId,
    hostBName,
    scoreA: 0,
    scoreB: 0,
    status: "active",
    startedAt: serverTimestamp(),
    endsAt: Date.now() + BATTLE_DURATION_MS,
  });
  return ref.id;
}

/** Listens for an active battle involving this room, so both hosts' screens stay in sync. */
export function listenActiveBattleForRoom(roomId, callback) {
  const q1 = query(
    collection(db, "pkBattles"),
    where("roomAId", "==", roomId),
    where("status", "==", "active")
  );
  const q2 = query(
    collection(db, "pkBattles"),
    where("roomBId", "==", roomId),
    where("status", "==", "active")
  );

  let latestA = [];
  let latestB = [];
  const emit = () => {
    const combined = [...latestA, ...latestB];
    callback(combined[0] || null);
  };

  const unsub1 = onSnapshot(q1, (snap) => {
    latestA = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
  });
  const unsub2 = onSnapshot(q2, (snap) => {
    latestB = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
  });

  return () => {
    unsub1();
    unsub2();
  };
}

/** Adds gift value to whichever side's room received it. Called right after sendGift(). */
export async function addBattleScore(battleId, side, amount) {
  const field = side === "A" ? "scoreA" : "scoreB";
  await updateDoc(doc(db, "pkBattles", battleId), { [field]: increment(amount) });
}

export async function endPkBattle(battleId) {
  await updateDoc(doc(db, "pkBattles", battleId), { status: "ended" });
}
