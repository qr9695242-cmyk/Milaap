"use client";

import { acceptCoHostInvite, declineCoHostInvite } from "@/lib/coHost";

export default function CoHostInvitePrompt({ roomId, invite, myUid, myName }) {
  if (!invite || invite.uid !== myUid) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 rounded-2xl bg-panel p-4 shadow-lg ring-1 ring-neon-violet/40">
      <p className="text-sm text-ink">
        <span className="font-semibold text-neon-violet">Host</span> invited you to join the video! 🎥
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => acceptCoHostInvite(roomId, myUid, myName)}
          className="flex-1 rounded-full bg-glow-gradient py-2 text-sm font-semibold text-ink"
        >
          Accept
        </button>
        <button
          onClick={() => declineCoHostInvite(roomId)}
          className="flex-1 rounded-full bg-panel2 py-2 text-sm font-semibold text-mist ring-1 ring-white/10"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
