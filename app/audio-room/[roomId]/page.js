"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenRoom, endRoom, takeSeat, leaveSeat, toggleSeatMute, announceEntrance } from "@/lib/rooms";
import { findBackground } from "@/lib/backgrounds";
import { findItem } from "@/lib/decorations";
import { createAgoraClient, createMicTrack, fetchAgoraToken, AGORA_APP_ID } from "@/lib/agora";
import SeatGrid from "@/components/SeatGrid";
import LiveChat from "@/components/LiveChat";
import GiftBar from "@/components/GiftBar";
import GiftFeed from "@/components/GiftFeed";
import EntranceBanner from "@/components/EntranceBanner";
import BackgroundPicker from "@/components/BackgroundPicker";

export default function AudioRoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);

  const clientRef = useRef(null);
  const micTrackRef = useRef(null);
  const remoteAudioRef = useRef({}); // uid -> audioTrack, so we can clean up on leave

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenRoom(roomId, setRoom);
    return () => unsub();
  }, [roomId]);

  const isHost = room && user && room.hostUid === user.uid;
  const mySeat = room?.seats?.find((s) => s.uid === user?.uid);

  // Announce this user's ride once per visit ("Ride in style when you enter a room")
  const announcedRef = useRef(false);
  useEffect(() => {
    if (!room || !user || announcedRef.current) return;
    announcedRef.current = true;
    const vehicleId = profile?.equippedVehicle;
    const vehicle = vehicleId ? findItem("vehicle", vehicleId) : null;
    announceEntrance(roomId, {
      uid: user.uid,
      name: profile?.displayName || "User",
      vehicleId: vehicle?.id,
      vehicleName: vehicle?.name,
      vehicleImage: vehicle?.image,
    });
  }, [room?.id, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join the Agora audio channel as soon as we land in the room (everyone can listen)
  useEffect(() => {
    if (!room || !user || !AGORA_APP_ID) return;
    let cancelled = false;

    async function join() {
      try {
        const client = await createAgoraClient("rtc");
        clientRef.current = client;

        client.on("user-published", async (remoteUser, mediaType) => {
          if (mediaType !== "audio") return;
          await client.subscribe(remoteUser, mediaType);
          remoteUser.audioTrack.play();
          remoteAudioRef.current[remoteUser.uid] = remoteUser.audioTrack;
        });

        client.on("user-unpublished", (remoteUser) => {
          delete remoteAudioRef.current[remoteUser.uid];
        });

        const token = await fetchAgoraToken(String(roomId), user.uid);
        if (cancelled) return;
        await client.join(AGORA_APP_ID, String(roomId), token, user.uid);
        if (cancelled) return;
      } catch (err) {
        console.error(err);
        const detail = err?.message || err?.code || "unknown error";
        setError(`Could not connect to audio (${detail}).`);
      }
    }

    join();

    return () => {
      cancelled = true;
      micTrackRef.current?.close();
      clientRef.current?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Publish mic only while sitting in a seat
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    async function publishMic() {
      if (mySeat && !micTrackRef.current) {
        const track = await createMicTrack();
        micTrackRef.current = track;
        await client.publish([track]);
      }
      if (!mySeat && micTrackRef.current) {
        await client.unpublish([micTrackRef.current]);
        micTrackRef.current.close();
        micTrackRef.current = null;
      }
    }
    publishMic();
  }, [mySeat]);

  async function handleSeatTap(seat) {
    if (seat.uid && seat.uid !== user.uid) return; // occupied by someone else
    if (seat.uid === user.uid) {
      await leaveSeat(roomId, seat.seatIndex);
    } else {
      try {
        await takeSeat(
          roomId,
          seat.seatIndex,
          user.uid,
          profile?.displayName || "User",
          profile?.vipLevel || 0,
          profile?.equippedFrame || null
        );
      } catch (e) {
        // Seat got taken by someone else a moment ago — ignore
      }
    }
  }

  function toggleMic() {
    if (!micTrackRef.current) return;
    micTrackRef.current.setEnabled(!micOn);
    toggleSeatMute(roomId, mySeat.seatIndex, micOn);
    setMicOn(!micOn);
  }

  async function handleEndOrLeave() {
    if (mySeat) await leaveSeat(roomId, mySeat.seatIndex);
    if (isHost) await endRoom(roomId);
    router.push("/rooms");
  }

  if (loading || !user || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const bg = findBackground(room.background);

  return (
    <main className="flex min-h-screen flex-col bg-void" style={{ background: bg.css }}>
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={handleEndOrLeave} aria-label="Back" className="text-lg text-ink/80">
            ←
          </button>
          <div>
            <p className="font-display text-sm font-bold text-ink">{room.title}</p>
            <p className="text-xs text-mist">Hosted by {room.hostName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHost && <BackgroundPicker roomId={String(roomId)} current={room.background} />}
          <button
            onClick={handleEndOrLeave}
            className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30"
          >
            {isHost ? "End" : "Leave"}
          </button>
        </div>
      </header>

      {!AGORA_APP_ID && (
        <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-gold">
          ⚠️ NEXT_PUBLIC_AGORA_APP_ID is not set in .env.local — audio won't connect until it is.
        </p>
      )}
      {error && <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-neon-pink">{error}</p>}

      <div className="relative mt-4">
        <GiftFeed roomId={String(roomId)} />
        <EntranceBanner roomId={String(roomId)} />
        <SeatGrid seats={room.seats || []} myUid={user.uid} onSeatTap={handleSeatTap} />
      </div>

      <GiftBar
        roomId={String(roomId)}
        fromUid={user.uid}
        fromName={profile?.displayName || "User"}
        targets={(room.seats || [])
          .filter((s) => s.uid && s.uid !== user.uid)
          .map((s) => ({ uid: s.uid, name: s.name }))}
        myCoins={profile?.coins ?? 0}
      />

      {mySeat && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={toggleMic}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              micOn ? "bg-panel text-ink ring-1 ring-white/10" : "bg-neon-pink/20 text-neon-pink"
            }`}
          >
            {micOn ? "🎤 Mic On" : "🔇 Mic Off"}
          </button>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-hidden border-t border-white/5">
        <LiveChat roomId={String(roomId)} uid={user.uid} name={profile?.displayName || "User"} />
      </div>
    </main>
  );
}
