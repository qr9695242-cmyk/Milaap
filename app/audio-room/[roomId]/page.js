"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenRoom, endRoom, takeSeat, leaveSeat, toggleSeatMute, announceEntrance, pickRandomOtherRoom } from "@/lib/rooms";
import { joinRoomPresence, listenParticipants } from "@/lib/coHost";
import { listenGiftFeed } from "@/lib/gifts";
import { findBackground } from "@/lib/backgrounds";
import { findItem } from "@/lib/decorations";
import { vipLevelForSpend } from "@/lib/vip";
import { createAgoraClient, createMicTrack, createCustomAudioTrack, fetchAgoraToken, AGORA_APP_ID } from "@/lib/agora";
import { applyVoiceEffect } from "@/lib/voiceEffects";
import SeatGrid from "@/components/SeatGrid";
import SeatActionSheet from "@/components/SeatActionSheet";
import LiveChat from "@/components/LiveChat";
import GiftBar from "@/components/GiftBar";
import GiftFeed from "@/components/GiftFeed";
import GiftPopup from "@/components/GiftPopup";
import EntranceBanner from "@/components/EntranceBanner";
import BackgroundPicker from "@/components/BackgroundPicker";
import VoiceEffectPicker from "@/components/VoiceEffectPicker";

export default function AudioRoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [micReady, setMicReady] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [confirmExit, setConfirmExit] = useState(false);
  // "leave" = power button (Cancel/Leave-or-End card). "swipe" = swiped up
  // to room-match into a new room (Keep-or-Exit overlay).
  const [exitMode, setExitMode] = useState("leave");
  const [matching, setMatching] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sessionCoins, setSessionCoins] = useState(0);
  const touchStartYRef = useRef(null);

  const clientRef = useRef(null);
  const micTrackRef = useRef(null); // raw mic track (always what mic-on/off toggles)
  const publishedTrackRef = useRef(null); // what's actually published (raw mic, or the voice-effect track)
  const effectStopRef = useRef(null); // tears down the current Web Audio effect graph, if any
  const remoteAudioRef = useRef({}); // uid -> audioTrack, so we can clean up on leave

  const equippedEffect = profile?.equippedVoiceEffect || "original";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenRoom(roomId, setRoom);
    return () => unsub();
  }, [roomId]);

  // Presence heartbeat so the "Invite" seat action can see who's in the room
  useEffect(() => {
    if (!user) return;
    const leave = joinRoomPresence(roomId, user.uid, profile?.displayName || "User");
    return () => leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.uid]);

  // Session gift/coin tally — shown on the End/Leave confirm card so the
  // host can see how much this session earned before closing the room.
  useEffect(() => {
    const unsub = listenGiftFeed(roomId, (feed) => {
      setSessionCoins(feed.reduce((sum, g) => sum + (g.cost || 0), 0));
    }, 200);
    return () => unsub();
  }, [roomId]);

  // Hardware/browser back button (and swipe-back gesture) shouldn't drop
  // straight out of a live room — route it through the same confirm card
  // as the power button instead of navigating away silently.
  useEffect(() => {
    window.history.pushState({ roomGuard: true }, "");
    function onPopState() {
      window.history.pushState({ roomGuard: true }, "");
      setExitMode("leave");
      setConfirmExit(true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Live headcount for the top bar (real participants, not the unused viewerCount field)
  useEffect(() => {
    const unsub = listenParticipants(roomId, setParticipants);
    return () => unsub();
  }, [roomId]);

  const [actionSheetSeatIndex, setActionSheetSeatIndex] = useState(null);
  const actionSheetSeat =
    actionSheetSeatIndex != null ? (room?.seats || []).find((s) => s.seatIndex === actionSheetSeatIndex) : null;

  const isHost = room && user && room.hostUid === user.uid;
  const mySeat = room?.seats?.find((s) => s.uid === user?.uid);
  const hostVipTier = room ? vipLevelForSpend(room.hostTotalRechargedRs) : null;

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
      vehicleVideo: vehicle?.video,
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
      effectStopRef.current?.();
      effectStopRef.current = null;
      if (publishedTrackRef.current && publishedTrackRef.current !== micTrackRef.current) {
        publishedTrackRef.current.close?.();
      }
      publishedTrackRef.current = null;
      micTrackRef.current?.close();
      clientRef.current?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Unpublishes + tears down whatever's currently published (raw mic or a voice-effect track).
  async function teardownPublished() {
    const client = clientRef.current;
    if (client && publishedTrackRef.current) {
      await client.unpublish([publishedTrackRef.current]).catch(() => {});
    }
    if (publishedTrackRef.current && publishedTrackRef.current !== micTrackRef.current) {
      publishedTrackRef.current.close?.();
    }
    publishedTrackRef.current = null;
    effectStopRef.current?.();
    effectStopRef.current = null;
  }

  // Create/destroy the raw mic track only while sitting in a seat.
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    let cancelled = false;

    async function manage() {
      if (mySeat && !micTrackRef.current) {
        const track = await createMicTrack();
        if (cancelled) {
          track.close();
          return;
        }
        micTrackRef.current = track;
        setMicReady(true);
      }
      if (!mySeat && micTrackRef.current) {
        await teardownPublished();
        micTrackRef.current.close();
        micTrackRef.current = null;
        setMicReady(false);
      }
    }
    manage();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySeat]);

  // Publish (or re-publish) whenever the mic becomes ready or the voice effect changes.
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !micReady || !micTrackRef.current) return;
    let cancelled = false;

    async function publishWithEffect() {
      await teardownPublished();
      let toPublish = micTrackRef.current;

      if (equippedEffect !== "original") {
        try {
          const raw = micTrackRef.current.getMediaStreamTrack();
          const { track: processed, stop } = await applyVoiceEffect(raw, equippedEffect);
          if (cancelled) {
            stop();
            return;
          }
          effectStopRef.current = stop;
          toPublish = await createCustomAudioTrack(processed);
          setVoiceUnsupported(false);
        } catch (e) {
          console.error("Voice effect unavailable:", e);
          setVoiceUnsupported(true);
          toPublish = micTrackRef.current;
        }
      } else {
        setVoiceUnsupported(false);
      }

      if (cancelled) return;
      publishedTrackRef.current = toPublish;
      await client.publish([toPublish]);
    }
    publishWithEffect();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micReady, equippedEffect]);

  async function handleSeatTap(seat) {
    if (isHost) {
      setActionSheetSeatIndex(seat.seatIndex);
      return;
    }
    if (seat.uid && seat.uid !== user.uid) return; // occupied by someone else
    if (seat.uid === user.uid) {
      await leaveSeat(roomId, seat.seatIndex);
    } else {
      if (seat.locked) return;
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
        // Seat got taken (or locked) a moment ago — ignore
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

  // Room Match: swiped up past the current room — leave it and drop into
  // another random live one, Omegle/TikTok-Live style.
  async function handleRoomMatch() {
    setMatching(true);
    try {
      if (mySeat) await leaveSeat(roomId, mySeat.seatIndex);
      const nextId = await pickRandomOtherRoom(String(roomId));
      if (nextId) router.replace(`/audio-room/${nextId}`);
      else router.push("/rooms");
    } finally {
      setMatching(false);
      setConfirmExit(false);
    }
  }

  function handleExitConfirm() {
    if (exitMode === "swipe") handleRoomMatch();
    else handleEndOrLeave();
  }

  function onTouchStart(e) {
    if (isHost) return; // host swiping away would strand the room — use the power button instead
    touchStartYRef.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    if (isHost || touchStartYRef.current == null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY < -80) {
      setExitMode("swipe");
      setConfirmExit(true);
    }
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
    <main
      className="flex min-h-screen flex-col bg-void"
      style={{ background: bg.css }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex items-center justify-between px-4 py-3 pt-safe">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink">{room.title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-mist">
              <span className="rounded-full bg-black/30 px-2 py-0.5 font-semibold text-gold ring-1 ring-gold/20">
                ID {String(roomId).slice(-5)}
              </span>
              <span className="rounded-full bg-black/30 px-2 py-0.5">👥 {participants.length}</span>
              <span>Hosted by {room.hostName}</span>
              {hostVipTier && hostVipTier.level > 0 && (
                <span className="font-semibold" style={{ color: hostVipTier.color }}>
                  {hostVipTier.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isHost && <BackgroundPicker roomId={String(roomId)} current={room.background} />}
          <button
            onClick={() => {
              setExitMode("leave");
              setConfirmExit(true);
            }}
            aria-label={isHost ? "End room" : "Leave room"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-ink ring-1 ring-white/15 active:scale-95"
          >
            ⏻
          </button>
        </div>
      </header>

      {!isHost && (
        <p className="px-4 text-center text-[10px] text-mist/70">↑ Swipe up for a new room (Room Match)</p>
      )}

      {confirmExit &&
        (exitMode === "swipe" ? (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/70"
            onClick={() => setConfirmExit(false)}
          >
            <p className="max-w-[220px] text-center text-sm font-semibold text-ink">
              Isi room mein rukna hai, ya agle room mein jump karna hai?
            </p>
            <div className="flex items-center gap-14" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setConfirmExit(false)}
                className="flex flex-col items-center gap-2"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-400 text-2xl text-black active:scale-95">
                  ↑
                </span>
                <span className="text-xs font-semibold text-ink">Keep</span>
              </button>
              <button
                onClick={handleExitConfirm}
                disabled={matching}
                className="flex flex-col items-center gap-2 disabled:opacity-60"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-400 text-2xl text-black active:scale-95">
                  ⏻
                </span>
                <span className="text-xs font-semibold text-ink">{matching ? "Matching…" : "Exit"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmExit(false)}>
            <div className="premium-card mx-6 w-full max-w-xs p-5 text-center" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold text-ink">
                {isHost ? "Room end karna hai?" : "Room chhorna hai?"}
              </p>
              <p className="mt-1 text-[11px] text-mist">
                {isHost ? "Yeh sabke liye room band kar dega." : "Aap kabhi bhi dobara join kar sakte hain."}
              </p>
              <div className="mt-3 flex items-center justify-center gap-4 rounded-xl bg-panel2 py-2">
                <span className="text-xs font-semibold text-ink">👥 {participants.length} log</span>
                <span className="text-xs font-semibold text-gold">● {sessionCoins.toLocaleString()} coins</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="flex-1 rounded-full bg-panel2 py-2 text-xs font-semibold text-ink ring-1 ring-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExitConfirm}
                  className="flex-1 rounded-full bg-neon-pink/20 py-2 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30"
                >
                  {isHost ? "End" : "Leave"}
                </button>
              </div>
            </div>
          </div>
        ))}

      {!AGORA_APP_ID && (
        <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-gold">
          ⚠️ NEXT_PUBLIC_AGORA_APP_ID is not set in .env.local — audio won't connect until it is.
        </p>
      )}
      {error && <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-neon-pink">{error}</p>}
      {voiceUnsupported && equippedEffect !== "original" && (
        <p className="mx-4 rounded-lg bg-panel p-3 text-xs text-neon-pink">
          Voice effects unavailable on this device — using standard mic.
        </p>
      )}

      <div className="relative mt-4">
        <GiftFeed roomId={String(roomId)} />
        <EntranceBanner roomId={String(roomId)} />
        <SeatGrid seats={room.seats || []} myUid={user.uid} onSeatTap={handleSeatTap} />
        <GiftPopup roomId={String(roomId)} />
      </div>

      {showWelcome && (
        <div className="relative mx-4 mt-4 rounded-2xl bg-black/35 p-3 text-[11px] leading-relaxed text-ink/85 ring-1 ring-white/10">
          <button
            onClick={() => setShowWelcome(false)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 text-ink/50"
          >
            ✕
          </button>
          <p className="pr-5">
            Welcome! Please respect each other and talk politely. Abusing, third-party
            advertising, fake official information and politically sensitive topics are
            strictly prohibited. Please report if you find these situations.
          </p>
        </div>
      )}

      {actionSheetSeat && (
        <SeatActionSheet
          roomId={String(roomId)}
          seat={actionSheetSeat}
          isHost={isHost}
          isMySeat={actionSheetSeat.uid === user.uid}
          myUid={user.uid}
          myName={profile?.displayName || "User"}
          onClose={() => setActionSheetSeatIndex(null)}
        />
      )}

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
        <div className="mt-4 flex justify-center gap-3">
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

      <div className="mt-4 flex-1 overflow-hidden border-t border-white/5">
        <LiveChat roomId={String(roomId)} uid={user.uid} name={profile?.displayName || "User"} />
      </div>
    </main>
  );
}
