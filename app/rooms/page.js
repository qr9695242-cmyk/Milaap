"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenActiveRooms, createRoom } from "@/lib/rooms";
import BottomNav from "@/components/BottomNav";
import PremiumCard from "@/components/PremiumCard";

export default function RoomsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [roomsError, setRoomsError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [seatLayout, setSeatLayout] = useState(6);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenActiveRooms(setRooms, (err) =>
      setRoomsError(err?.message || "Rooms load nahi ho sakay.")
    );
    return () => unsub();
  }, []);

  async function handleCreate() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const roomId = await createRoom({
        type: "audio",
        title: title.trim(),
        hostUid: user.uid,
        hostName: profile?.displayName || "Host",
        seatLayout,
      });
      setShowCreate(false);
      setTitle("");
      setSeatLayout(6);
      router.push(`/audio-room/${roomId}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const audioRooms = rooms.filter((r) => r.type === "audio");

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="font-display text-xl font-extrabold text-ink">Rooms</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="premium-btn !rounded-full !px-4 !py-2 !text-xs"
        >
          + Create Room
        </button>
      </header>

      {roomsError && (
        <p className="mx-5 mt-3 rounded-xl bg-panel p-3 text-xs text-neon-pink ring-1 ring-neon-pink/20">
          Rooms load nahi ho sakay: {roomsError} — agar "index" ka zikar ho to
          browser console (F12) khol kar Firestore ka diya hua link click
          karein, index ban jayega.
        </p>
      )}

      <RoomSection title="Audio Rooms" rooms={audioRooms} kind="audio" />

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-2xl bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-ink">
              Start something
            </h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Room title"
              className="mt-4 w-full rounded-xl bg-panel2 px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
            />

            <p className="mt-4 text-xs font-semibold text-mist">Seat Layout</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                onClick={() => setSeatLayout(6)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition ${
                  seatLayout === 6
                    ? "bg-neon-violet/20 text-ink ring-neon-violet"
                    : "bg-panel2 text-mist ring-white/10"
                }`}
              >
                6 Seats
              </button>
              <button
                onClick={() => setSeatLayout(1)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition ${
                  seatLayout === 1
                    ? "bg-neon-violet/20 text-ink ring-neon-violet"
                    : "bg-panel2 text-mist ring-white/10"
                }`}
              >
                1 Seat (1-on-1)
              </button>
            </div>

            <button
              disabled={busy}
              onClick={handleCreate}
              className="premium-btn mt-4 w-full disabled:opacity-60"
            >
              🎙 Create Audio Room
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-3 w-full py-2 text-center text-xs text-mist"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function RoomSection({ title, rooms, kind }) {
  const router = useRouter();
  return (
    <section className="mt-6 px-5">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      {rooms.length === 0 ? (
        <p className="mt-3 text-xs text-mist">Nothing live right now.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => router.push(`/audio-room/${room.id}`)}
              className="text-left"
            >
              <PremiumCard className="p-3">
                <span className="rounded-full bg-neon-pink/20 px-2 py-0.5 text-[10px] font-semibold text-neon-pink">
                  Audio
                </span>
                <p className="mt-2 truncate font-display text-sm font-bold text-ink">
                  {room.title}
                </p>
                <p className="truncate text-xs text-mist">{room.hostName}</p>
              </PremiumCard>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
