"use client";

import { useEffect, useState } from "react";
import { listenParticipants, inviteCoHost, removeCoHost } from "@/lib/coHost";

export default function AddGuestButton({ roomId, hostUid, coHostUid, coHostName }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!open) return;
    const unsub = listenParticipants(roomId, setPeople);
    return () => unsub();
  }, [open, roomId]);

  const invitable = people.filter((p) => p.uid !== hostUid && p.uid !== coHostUid);

  async function invite(p) {
    setBusy(p.uid);
    try {
      await inviteCoHost(roomId, p.uid, p.name);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function kick() {
    setBusy("kick");
    try {
      await removeCoHost(roomId);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add someone to video"
        className="rounded-full bg-panel px-2.5 py-1.5 text-sm ring-1 ring-white/10"
      >
        ➕
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-sm font-bold text-ink">Add someone to video</h2>

            {coHostUid ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-panel2 px-3 py-2">
                <p className="text-sm text-ink">
                  <span className="font-semibold text-neon-violet">{coHostName}</span> is on video
                </p>
                <button
                  onClick={kick}
                  disabled={busy === "kick"}
                  className="rounded-full bg-neon-pink/20 px-3 py-1 text-xs font-semibold text-neon-pink disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-mist">Tap someone in the room to invite them onto your video.</p>
            )}

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {invitable.length === 0 && (
                <p className="py-4 text-center text-xs text-mist">No one else in the room yet.</p>
              )}
              {invitable.map((p) => (
                <button
                  key={p.uid}
                  disabled={!!coHostUid || busy === p.uid}
                  onClick={() => invite(p)}
                  className="flex w-full items-center justify-between rounded-xl bg-panel2 px-3 py-2 text-sm text-ink ring-1 ring-white/5 disabled:opacity-40"
                >
                  <span>{p.name}</span>
                  <span className="text-xs text-neon-violet">{busy === p.uid ? "Inviting…" : "Invite"}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 text-center text-xs text-mist">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
