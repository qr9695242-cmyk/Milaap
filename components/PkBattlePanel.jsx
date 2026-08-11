"use client";

import { useEffect, useState } from "react";
import { listenActiveRooms } from "@/lib/rooms";
import { startPkBattle, endPkBattle } from "@/lib/pkbattle";

export default function PkBattlePanel({ room, roomId, isHost, activeBattle }) {
  const [showPicker, setShowPicker] = useState(false);
  const [otherLiveRooms, setOtherLiveRooms] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!showPicker) return;
    const unsub = listenActiveRooms((rooms) => {
      setOtherLiveRooms(
        rooms.filter((r) => r.type === "live" && r.id !== roomId && r.hostUid !== room.hostUid)
      );
    });
    return () => unsub();
  }, [showPicker, roomId, room.hostUid]);

  useEffect(() => {
    if (!activeBattle?.endsAt) return;
    const tick = () => {
      const remaining = Math.max(0, activeBattle.endsAt - Date.now());
      setTimeLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeBattle?.endsAt]);

  async function handleChallenge(target) {
    await startPkBattle({
      roomAId: roomId,
      hostAId: room.hostUid,
      hostAName: room.hostName,
      roomBId: target.id,
      hostBId: target.hostUid,
      hostBName: target.hostName,
    });
    setShowPicker(false);
  }

  if (activeBattle) {
    const mySide = activeBattle.roomAId === roomId ? "A" : "B";
    const myScore = mySide === "A" ? activeBattle.scoreA : activeBattle.scoreB;
    const theirScore = mySide === "A" ? activeBattle.scoreB : activeBattle.scoreA;
    const theirName = mySide === "A" ? activeBattle.hostBName : activeBattle.hostAName;
    const total = myScore + theirScore || 1;
    const myPct = Math.round((myScore / total) * 100);

    return (
      <div className="mx-4 mt-3 rounded-xl bg-panel p-3 ring-1 ring-neon-pink/30">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">You · {myScore}</span>
          <span className="text-gold">
            ⚔ {timeLeft != null ? formatTime(timeLeft) : "--:--"}
          </span>
          <span className="font-semibold text-ink">{theirScore} · {theirName}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full bg-glow-gradient"
            style={{ width: `${myPct}%` }}
          />
        </div>
        {isHost && (
          <button
            onClick={() => endPkBattle(activeBattle.id)}
            className="mt-2 w-full rounded-full bg-panel2 py-1.5 text-[11px] text-mist"
          >
            End Battle
          </button>
        )}
      </div>
    );
  }

  if (!isHost) return null;

  return (
    <div className="mx-4 mt-3">
      <button
        onClick={() => setShowPicker(true)}
        className="w-full rounded-full bg-panel2 py-2 text-xs font-semibold text-ink ring-1 ring-white/10"
      >
        ⚔ Start PK Battle
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-2xl bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-ink">
              Challenge a host
            </h2>
            {otherLiveRooms.length === 0 ? (
              <p className="mt-4 text-xs text-mist">
                No other live streams right now.
              </p>
            ) : (
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {otherLiveRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleChallenge(r)}
                    className="flex w-full items-center justify-between rounded-xl bg-panel2 px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{r.hostName}</p>
                      <p className="text-xs text-mist">{r.title}</p>
                    </div>
                    <span className="text-xs text-neon-pink">Challenge</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full py-2 text-center text-xs text-mist"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}
