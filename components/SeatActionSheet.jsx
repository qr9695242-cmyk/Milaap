"use client";

import { useEffect, useState } from "react";
import { listenParticipants } from "@/lib/coHost";
import {
  takeSeat,
  removeFromSeat,
  toggleSeatLock,
  toggleAllSeatsLock,
  toggleSeatMute,
} from "@/lib/rooms";

/**
 * seat: the seat object that was tapped
 * isHost: whether the current viewer can manage seats
 * isMySeat: whether the current viewer is the one sitting here
 * myUid/myName: current viewer identity, for the "On Mic" self-join action
 */
export default function SeatActionSheet({
  roomId,
  seat,
  isHost,
  isMySeat,
  myUid,
  myName,
  onClose,
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!inviteOpen) return;
    const unsub = listenParticipants(roomId, setParticipants);
    return () => unsub();
  }, [inviteOpen, roomId]);

  if (!seat) return null;

  const occupied = !!seat.uid;

  async function run(action) {
    setBusy(true);
    try {
      await action();
      onClose();
    } catch (e) {
      // Seat state may have just changed under us — safe to ignore, sheet just closes
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const options = [];

  if (!occupied && !seat.locked) {
    options.push({ label: "On Mic", onClick: () => run(() => takeSeat(roomId, seat.seatIndex, myUid, myName)) });
  }
  if (isMySeat) {
    options.push({ label: "Off Mic", onClick: () => run(() => removeFromSeat(roomId, seat.seatIndex)) });
  }

  if (isHost) {
    if (!occupied && !seat.locked) {
      options.push({ label: "Invite", onClick: () => setInviteOpen(true) });
    }
    if (occupied && !isMySeat) {
      options.push({ label: "Remove from Mic", onClick: () => run(() => removeFromSeat(roomId, seat.seatIndex)) });
      options.push({
        label: seat.muted ? "Unmute" : "Mute",
        onClick: () => run(() => toggleSeatMute(roomId, seat.seatIndex, !seat.muted)),
      });
    }
    options.push({
      label: seat.locked ? "Unlock" : "Lock",
      onClick: () => run(() => toggleSeatLock(roomId, seat.seatIndex, !seat.locked)),
    });
    options.push({ label: "Lock All", onClick: () => run(() => toggleAllSeatsLock(roomId, true)) });
    options.push({ label: "Unlock All", onClick: () => run(() => toggleAllSeatsLock(roomId, false)) });
  }

  if (inviteOpen) {
    const invitable = participants.filter((p) => p.uid && p.uid !== seat.uid);
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
        <div className="w-full max-w-md rounded-t-2xl bg-panel p-5" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-display text-sm font-bold text-ink">Invite to seat {seat.seatIndex + 1}</h2>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {invitable.length === 0 && (
              <p className="py-4 text-center text-xs text-mist">No one else in the room yet.</p>
            )}
            {invitable.map((p) => (
              <button
                key={p.uid}
                disabled={busy}
                onClick={() => run(() => takeSeat(roomId, seat.seatIndex, p.uid, p.name))}
                className="flex w-full items-center justify-between rounded-xl bg-panel2 px-3 py-2 text-sm text-ink ring-1 ring-white/5 disabled:opacity-40"
              >
                <span>{p.name || "User"}</span>
                <span className="text-xs text-neon-violet">Invite</span>
              </button>
            ))}
          </div>
          <button onClick={() => setInviteOpen(false)} className="mt-4 w-full py-2 text-center text-xs text-mist">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white pb-2" onClick={(e) => e.stopPropagation()}>
        {options.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-gray-400">No actions available for this seat.</p>
        )}
        {options.map((opt, i) => (
          <button
            key={opt.label}
            disabled={busy}
            onClick={opt.onClick}
            className={`block w-full py-4 text-center text-base text-gray-800 disabled:opacity-40 ${
              i > 0 ? "border-t border-gray-100" : ""
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="mt-2 block w-full border-t border-gray-200 py-4 text-center text-base text-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
