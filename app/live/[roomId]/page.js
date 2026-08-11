"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenRoom, endRoom, announceEntrance } from "@/lib/rooms";
import { findBackground } from "@/lib/backgrounds";
import { findItem } from "@/lib/decorations";
import { joinRoomPresence, removeCoHost, listenParticipants } from "@/lib/coHost";
import { createAgoraClient, createMicAndCameraTracks, fetchAgoraToken, AGORA_APP_ID } from "@/lib/agora";
import LiveChat from "@/components/LiveChat";
import GiftBar from "@/components/GiftBar";
import GiftFeed from "@/components/GiftFeed";
import FloatingHearts from "@/components/FloatingHearts";
import EntranceBanner from "@/components/EntranceBanner";
import BackgroundPicker from "@/components/BackgroundPicker";
import AddGuestButton from "@/components/AddGuestButton";
import CoHostInvitePrompt from "@/components/CoHostInvitePrompt";
import FollowButton from "@/components/FollowButton";

// Video stage always has two named slots: "primary" (the host) and
// "secondary" (the co-host, only shown once someone accepts an invite).
// Whoever's browser this is, their OWN camera (if any) plays locally into
// whichever slot matches their role; everyone else's feed is subscribed
// and played into the matching slot too. This way host / co-host /
// plain-viewer all render the same two-slot layout consistently.

export default function LiveRoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [room, setRoom] = useState(null);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [hearts, setHearts] = useState([]);
  const heartIdRef = useRef(0);

  const clientRef = useRef(null);
  const localTracksRef = useRef({ cam: null, mic: null });
  const primaryRef = useRef(null); // host's video slot
  const secondaryRef = useRef(null); // co-host's video slot
  const roomRef = useRef(null); // latest room doc, read inside Agora event handlers (avoid stale closures)

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenRoom(roomId, setRoom);
    return () => unsub();
  }, [roomId]);

  // Track who's in the room so the host has someone to invite onto video
  useEffect(() => {
    if (!user) return;
    const leave = joinRoomPresence(roomId, user.uid, profile?.displayName || "User");
    return () => leave();
  }, [roomId, user, profile?.displayName]);

  // Viewer count badge — same presence data AddGuestButton uses to build
  // its invite list, just counted here for display.
  useEffect(() => {
    const unsub = listenParticipants(roomId, (list) => setViewerCount(list.length));
    return () => unsub();
  }, [roomId]);

  const isHost = room && user && room.hostUid === user.uid;
  const isCoHost = room && user && room.coHostUid === user.uid;
  const onStage = isHost || isCoHost;
  const hasCoHost = !!room?.coHostUid;

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

  // Join the Agora channel once per room — everyone connects as "audience"
  // first and subscribes to whatever's published. Publishing our own
  // camera is handled separately below, reacting to onStage changing
  // (e.g. accepting a co-host invite) without needing to rejoin.
  useEffect(() => {
    if (!room || !user || !AGORA_APP_ID) return;
    let cancelled = false;

    async function join() {
      try {
        const client = await createAgoraClient("live");
        clientRef.current = client;
        await client.setClientRole("audience");

        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          const r = roomRef.current;
          const isRemoteHost = r && remoteUser.uid === r.hostUid;
          const isRemoteCoHost = r && remoteUser.uid === r.coHostUid;
          // Whichever role this remote user has, they belong in that slot
          // — this holds for host, co-host, AND plain viewers alike, since
          // no one ever needs to play their OWN uid's remote track.
          const container = isRemoteHost
            ? primaryRef.current
            : isRemoteCoHost
            ? secondaryRef.current
            : null;

          if (mediaType === "video" && container) {
            remoteUser.videoTrack.play(container);
          }
          if (mediaType === "audio") {
            remoteUser.audioTrack.play();
          }
        });

        client.on("user-unpublished", (remoteUser) => {
          remoteUser.videoTrack?.stop();
        });

        const token = await fetchAgoraToken(String(roomId), user.uid);
        if (cancelled) return;
        await client.join(AGORA_APP_ID, String(roomId), token, user.uid);
        if (cancelled) return;

        setJoined(true);
      } catch (err) {
        console.error(err);
        const detail = err?.message || err?.code || "unknown error";
        setError(`Could not connect to the stream (${detail}).`);
      }
    }

    join();

    return () => {
      cancelled = true;
      const { cam, mic } = localTracksRef.current;
      cam?.close();
      mic?.close();
      localTracksRef.current = { cam: null, mic: null };
      clientRef.current?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Publish (or unpublish) my own camera whenever I go on/off stage —
  // covers both the original host and someone who just accepted a
  // co-host invite, without touching the channel connection above.
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !joined) return;
    let cancelled = false;

    async function publish() {
      if (onStage && !localTracksRef.current.cam) {
        try {
          await client.setClientRole("host");
          // Single combined request (one browser permission prompt for
          // both devices) instead of two sequential ones — see
          // createMicAndCameraTracks in lib/agora.js for why.
          const { micTrack, camTrack } = await createMicAndCameraTracks();
          if (cancelled) {
            camTrack.close();
            micTrack.close();
            return;
          }
          localTracksRef.current = { cam: camTrack, mic: micTrack };
          const slot = isHost ? primaryRef.current : secondaryRef.current;
          if (slot) camTrack.play(slot);
          await client.publish([camTrack, micTrack]);
        } catch (err) {
          console.error(err);
          const detail = err?.message || err?.code || "unknown error";
          // One combined permission request means we can't always tell
          // which device it was, so the message covers both rather than
          // wrongly blaming the camera when it was actually the mic.
          setError(`Could not start your camera/microphone (${detail}).`);
        }
      } else if (!onStage && localTracksRef.current.cam) {
        const { cam, mic } = localTracksRef.current;
        await client.unpublish([cam, mic]).catch(() => {});
        cam.close();
        mic.close();
        localTracksRef.current = { cam: null, mic: null };
        await client.setClientRole("audience").catch(() => {});
      }
    }

    publish();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStage, joined]);

  async function handleEndOrLeave() {
    if (isHost) await endRoom(roomId);
    else if (isCoHost) await removeCoHost(roomId); // leaving video, not the whole room
    router.push("/rooms");
  }

  async function handleShare() {
    const url = `${window.location.origin}/live/${roomId}`;
    const shareData = { title: room?.title || "Milaap Live", text: `${room?.hostName} is live on Milaap — join in!`, url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // AbortError just means the user closed the native share sheet — not a real failure
        if (err?.name !== "AbortError") console.error(err);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2000);
    } catch (err) {
      console.error(err);
      setShareMsg("Couldn't copy link");
      setTimeout(() => setShareMsg(""), 2000);
    }
  }

  function sendHeart() {
    const id = heartIdRef.current++;
    const emoji = ["❤️", "💖", "💕", "💗"][id % 4];
    const x = 15 + Math.random() * 70; // keep clear of the edges
    setHearts((h) => [...h, { id, emoji, x }]);
    setTimeout(() => {
      setHearts((h) => h.filter((heart) => heart.id !== id));
    }, 2600);
  }

  function toggleMic() {
    const mic = localTracksRef.current.mic;
    if (!mic) return;
    mic.setEnabled(!micOn);
    setMicOn(!micOn);
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
            <p className="text-xs text-mist">
              Hosted by {room.hostName} · 👀 {viewerCount}
            </p>
          </div>
          {!isHost && (
            <FollowButton target={{ uid: room.hostUid, displayName: room.hostName }} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <AddGuestButton
              roomId={String(roomId)}
              hostUid={room.hostUid}
              coHostUid={room.coHostUid}
              coHostName={room.coHostName}
            />
          )}
          {isHost && <BackgroundPicker roomId={String(roomId)} current={room.background} />}
          <button
            onClick={handleShare}
            aria-label="Share this room"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-panel text-sm ring-1 ring-white/10"
          >
            📤
          </button>
          <button
            onClick={handleEndOrLeave}
            className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30"
          >
            {isHost ? "End" : isCoHost ? "Leave video" : "Leave"}
          </button>
        </div>
      </header>
      {shareMsg && (
        <p className="mx-4 -mt-1 mb-1 text-center text-[11px] text-mist">{shareMsg}</p>
      )}

      {!AGORA_APP_ID && (
        <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-gold">
          ⚠️ NEXT_PUBLIC_AGORA_APP_ID is not set in .env.local — video won't connect until it is.
        </p>
      )}
      {error && <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-neon-pink">{error}</p>}

      {/* Video stage — two slots, side by side once a co-host joins */}
      <div className="relative mx-4 aspect-[9/16] max-h-[52vh] overflow-hidden rounded-2xl bg-panel">
        <GiftFeed roomId={String(roomId)} />
        <EntranceBanner roomId={String(roomId)} />
        <FloatingHearts hearts={hearts} />

        <div className="flex h-full w-full">
          <div ref={primaryRef} className="h-full w-full flex-1" />
          {hasCoHost && <div ref={secondaryRef} className="h-full w-full flex-1 border-l border-white/10" />}
        </div>

        {hasCoHost && (
          <>
            <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-ink">
              {room.hostName}
            </span>
            <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-ink">
              {room.coHostName}
            </span>
          </>
        )}

        {!joined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-mist">Connecting…</p>
          </div>
        )}
      </div>

      <CoHostInvitePrompt
        roomId={String(roomId)}
        invite={room.coHostInvite}
        myUid={user.uid}
        myName={profile?.displayName || "User"}
      />

      {!isHost && showGifts && (
        <GiftBar
          roomId={String(roomId)}
          fromUid={user.uid}
          fromName={profile?.displayName || "User"}
          toUid={room.hostUid}
          toName={room.hostName}
          myCoins={profile?.coins ?? 0}
          onClose={() => setShowGifts(false)}
        />
      )}

      {onStage && (
        <div className="mx-4 mt-3 flex justify-center">
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

      {/* Chat fills remaining space */}
      <div className="mt-3 flex-1 overflow-hidden">
        <LiveChat
          roomId={String(roomId)}
          uid={user.uid}
          name={profile?.displayName || "User"}
          onOpenGifts={!isHost ? () => setShowGifts(true) : undefined}
          onSendHeart={sendHeart}
        />
      </div>
    </main>
  );
}
