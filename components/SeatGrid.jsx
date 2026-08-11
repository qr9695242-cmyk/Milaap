"use client";

import { PRIORITY_SEAT_INDEXES } from "@/lib/vip";
import FramedAvatar from "./FramedAvatar";

export default function SeatGrid({ seats, myUid, onSeatTap }) {
  // 1-seat rooms (1-on-1) get a single centered seat; everything else
  // falls back to a 3-column grid which fits the 6-seat layout nicely.
  const cols = seats.length <= 1 ? 1 : seats.length <= 6 ? 3 : 4;
  const gridColsClass =
    cols === 1 ? "grid-cols-1 justify-items-center" : cols === 3 ? "grid-cols-3" : "grid-cols-4";
  return (
    <div className={`grid ${gridColsClass} gap-3 px-4`}>
      {seats.map((seat) => {
        const occupied = !!seat.uid;
        const isMe = seat.uid === myUid;
        const isVip = (seat.vipLevel || 0) > 0;
        const isPriority = PRIORITY_SEAT_INDEXES.includes(seat.seatIndex);
        return (
          <button
            key={seat.seatIndex}
            onClick={() => onSeatTap(seat)}
            className="flex flex-col items-center gap-1"
          >
            {occupied ? (
              <div className="relative">
                <FramedAvatar
                  frameId={seat.frame}
                  name={seat.name}
                  size={56}
                  ring={!seat.frame}
                />
                {isMe && !seat.frame && (
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/60" />
                )}
                {isVip && <span className="absolute -right-1 -top-1 text-xs">👑</span>}
              </div>
            ) : (
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${
                  seat.locked
                    ? "border border-white/10 bg-panel2 text-mist/50"
                    : isPriority
                    ? "border border-dashed border-gold/40 text-gold/60"
                    : "border border-dashed border-white/15 text-mist"
                }`}
              >
                {seat.locked ? "🔒" : "+"}
              </div>
            )}
            <span className="max-w-[56px] truncate text-[10px] text-mist">
              {occupied ? seat.name : `Seat ${seat.seatIndex + 1}`}
            </span>
            {occupied && seat.muted && (
              <span className="text-[9px] text-neon-pink">muted</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
