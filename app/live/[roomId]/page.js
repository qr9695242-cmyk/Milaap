"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenRoom, endRoom, announceEntrance } from "@/lib/rooms";
import { findBackground } from "@/lib/backgrounds";
import { findItem } from "@/lib/decorations";
import { joinRoomPresence, removeCoHost } from "@/lib/coHost";
import {
  createAgoraClient,
  createCameraTrack,
  createMicTrack,
  createCustomAudioTrack,
  fetchAgoraToken,
  AGORA_APP_ID,
} from "@/lib/agora";
import { applyVoiceEffect } from "@/lib/voiceEffects";
import LiveChat from "@/components/LiveChat";
import GiftBar from "@/components/GiftBar";
import GiftFeed from "@/components/GiftFeed";
import GiftPopup from "@/components/GiftPopup";
import EntranceBanner from "@/components/EntranceBanner";
import BackgroundPicker from "@/components/BackgroundPicker";
import AddGuestButton from "@/components/AddGuestButton";
import CoHostInvitePrompt from "@/components/CoHostInvitePrompt";
import VoiceEffectPicker from "@/components/VoiceEffectPicker";
import RoomMoreMenu from "@/components/RoomMoreMenu";
import PkBattlePanel from "@/components/PkBattlePanel";
import RoomEntryRewardModal from "@/components/RoomEntryRewardModal";
import { listenActiveBattleForRoom } from "@/lib/pkbattle";
import Link from "next/link";

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
  const [pingMs, setPingMs] = useState(null);
  const [showGifts, setShowGifts] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);

  const clientRef = useRef(null);
  const localTracksRef = useRef({ cam: null, mic: null }); // raw tracks — mic here is always what mic-on/off toggles
  const publishedAudioRef = useRef(null); // what's actually published as audio (raw mic, or the voice-effect track)
  const effectStopRef = useRef(null); // tears down the current Web Audio effect graph, if any
  const primaryRef = useRef(null); // host's video slot
  const secondaryRef = useRef(null); // co-host's video slot
  const roomRef = useRef(null); // latest room doc, read inside Agora event handlers (avoid stale closures)

  const equippedEffect = profile?.equippedVoiceEffect || "original";

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

  const isHost = room && user && room.hostUid === user.uid;
  const isCoHost = room && user && room.coHostUid === user.uid;
  const onStage = isHost || isCoHost;
  const hasCoHost = !!room?.coHostUid;

  const [activeBattle, setActiveBattle] = useState(null);
  useEffect(() => {
    if (!roomId) return;
    const unsub = listenActiveBattleForRoom(String(roomId), setActiveBattle);
    return () => unsub();
  }, [roomId]);

  // Live "X ms" indicator, real Agora round-trip time.
  useEffect(() => {
    const id = setInterval(() => {
      const stats = clientRef.current?.getRTCStats?.();
      if (stats && typeof stats.RTT === "number") setPingMs(stats.RTT);
    }, 3000);
    return () => clearInterval(id);
  }, []);

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
      avatar: profile?.photoURL || profile?.avatar || user.photoURL || null,
      vehicleId: vehicle?.id,
      vehicleName: vehicle?.name,
      vehicleImage: vehicle?.image,
      vehicleVideo: vehicle?.video,
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
      effectStopRef.current?.();
      effectStopRef.current = null;
      const { cam, mic } = localTracksRef.current;
      cam?.close();
      mic?.close();
      if (publishedAudioRef.current && publishedAudioRef.current !== mic) {
        publishedAudioRef.current.close?.();
      }
      publishedAudioRef.current = null;
      localTracksRef.current = { cam: null, mic: null };
      clientRef.current?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Builds the audio track to publish given the currently equipped voice
  // effect — either the raw mic track (Original, or effect unsupported)
  // or a processed track running through the Web Audio graph.
  async function buildPublishableAudio(micTrack) {
    if (equippedEffect === "original") {
      setVoiceUnsupported(false);
      return micTrack;
    }
    try {
      const raw = micTrack.getMediaStreamTrack();
      const { track: processed, stop } = await applyVoiceEffect(raw, equippedEffect);
      effectStopRef.current = stop;
      setVoiceUnsupported(false);
      return await createCustomAudioTrack(processed);
    } catch (e) {
      console.error("Voice effect unavailable:", e);
      setVoiceUnsupported(true);
      return micTrack;
    }
  }

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
          const camTrack = await createCameraTrack();
          const micTrack = await createMicTrack();
          if (cancelled) {
            camTrack.close();
            micTrack.close();
            return;
          }
          localTracksRef.current = { cam: camTrack, mic: micTrack };
          const audioToPublish = await buildPublishableAudio(micTrack);
          if (cancelled) return;
          publishedAudioRef.current = audioToPublish;
          const slot = isHost ? primaryRef.current : secondaryRef.current;
          if (slot) camTrack.play(slot);
          await client.publish([camTrack, audioToPublish]);
        } catch (err) {
          console.error(err);
          const detail = err?.message || err?.code || "unknown error";
          setError(`Could not start your camera (${detail}).`);
        }
      } else if (!onStage && localTracksRef.current.cam) {
        const { cam, mic } = localTracksRef.current;
        const publishedAudio = publishedAudioRef.current || mic;
        await client.unpublish([cam, publishedAudio]).catch(() => {});
        effectStopRef.current?.();
        effectStopRef.current = null;
        if (publishedAudio !== mic) publishedAudio.close?.();
        publishedAudioRef.current = null;
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

  // Swap the live audio track whenever the equipped voice effect changes
  // while already on stage (initial publish above handles the first join).
  useEffect(() => {
    const client = clientRef.current;
    const mic = localTracksRef.current.mic;
    if (!client || !onStage || !mic) return;
    let cancelled = false;

    async function swap() {
      const oldAudio = publishedAudioRef.current || mic;
      effectStopRef.current?.();
      effectStopRef.current = null;
      const audioToPublish = await buildPublishableAudio(mic);
      if (cancelled) return;
      await client.unpublish([oldAudio]).catch(() => {});
      if (oldAudio !== mic) oldAudio.close?.();
      publishedAudioRef.current = audioToPublish;
      await client.publish([audioToPublish]);
    }
    swap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equippedEffect]);

  async function handleEndOrLeave() {
    if (isHost) await endRoom(roomId);
    else if (isCoHost) await removeCoHost(roomId); // leaving video, not the whole room
    router.push("/rooms");
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
      <header className="flex items-center justify-between px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <button onClick={handleEndOrLeave} aria-label="Back" className="text-lg text-ink/80">
            ←
          </button>
          <div>
            <p className="font-display text-sm font-bold text-ink">{room.title}</p>
            <p className="text-xs text-mist">
              Hosted by {room.hostName}
              {pingMs != null && (
                <span
                  className={`ml-2 font-semibold ${
                    pingMs < 150 ? "text-emerald-400" : pingMs < 350 ? "text-gold" : "text-neon-pink"
                  }`}
                >
                  📶 {pingMs} ms
                </span>
              )}
              {activeBattle && (
                <span className="ml-2 font-semibold text-neon-pink">⚔ PK Live</span>
              )}
            </p>
          </div>
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
          <Link
            href="/messages"
            aria-label="Messages"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-sm text-ink ring-1 ring-white/15"
          >
            ✉️
          </Link>
          <RoomMoreMenu />
          <button
            onClick={handleEndOrLeave}
            className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30"
          >
            {isHost ? "End" : isCoHost ? "Leave video" : "Leave"}
          </button>
        </div>
      </header>

      <RoomEntryRewardModal />

      {room && <PkBattlePanel room={room} roomId={String(roomId)} isHost={isHost} activeBattle={activeBattle} />}

      {!AGORA_APP_ID && (
        <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-gold">
          ⚠️ NEXT_PUBLIC_AGORA_APP_ID is not set in .env.local — video won't connect until it is.
        </p>
      )}
      {error && <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-neon-pink">{error}</p>}
      {voiceUnsupported && equippedEffect !== "original" && (
        <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-neon-pink">
          Voice effects unavailable on this device — using standard mic.
        </p>
      )}

      {/* Video stage — two slots, side by side once a co-host joins */}
      <div className="mx-4 mt-2 room-toolbar flex items-center gap-2 overflow-x-auto p-2">
        <Link href="/wallet" className="room-action shrink-0">💰<span className="mt-1 block text-[9px] font-bold text-gold">Recharge</span></Link>
        <button onClick={() => setShowGifts(true)} className="room-action shrink-0">🎁<span className="mt-1 block text-[9px] font-bold text-ink">Gifts</span></button>
        <Link href="/profile/frames" className="room-action shrink-0">🖼️<span className="mt-1 block text-[9px] font-bold text-ink">Frame</span></Link>
        <Link href="/profile/vehicles" className="room-action shrink-0">🚘<span className="mt-1 block text-[9px] font-bold text-ink">Ride</span></Link>
        <Link href="/vip" className="room-action shrink-0">👑<span className="mt-1 block text-[9px] font-bold text-gold">SVIP</span></Link>
        <Link href="/profile/friends" className="room-action shrink-0">💞<span className="mt-1 block text-[9px] font-bold text-ink">Friends</span></Link>
      </div>

      <div className="relative mx-4 aspect-[9/16] max-h-[52vh] overflow-hidden rounded-2xl bg-panel">
        <GiftFeed roomId={String(roomId)} />
        <EntranceBanner roomId={String(roomId)} />
        <GiftPopup roomId={String(roomId)} />

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
        <div className="mx-4 mt-3 flex justify-center gap-3">
          <button
            onClick={toggleMic}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              micOn ? "bg-panel text-ink ring-1 ring-white/10" : "bg-neon-pink/20 text-neon-pink"
            }`}
          >
            {micOn ? "🎤 Mic On" : "🔇 Mic Off"}
          </button>
          <VoiceEffectPicker
            uid={user.uid}
            coins={profile?.coins ?? 0}
            ownedEffects={profile?.ownedVoiceEffects}
            equippedEffect={equippedEffect}
            unsupported={voiceUnsupported}
          />
        </div>
      )}

      {/* Chat fills remaining space */}
      <div className="mt-3 flex-1 overflow-hidden">
        <LiveChat
          roomId={String(roomId)}
          uid={user.uid}
          name={profile?.displayName || "User"}
          onOpenGifts={!isHost ? () => setShowGifts(true) : undefined}
        />
      </div>
    </main>
  );
}
