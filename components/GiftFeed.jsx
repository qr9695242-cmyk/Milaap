"use client";

import { useEffect, useState } from "react";
import { listenGiftFeed } from "@/lib/gifts";

export default function GiftFeed({ roomId }) {
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    const unsub = listenGiftFeed(roomId, setGifts);
    return () => unsub();
  }, [roomId]);

  if (gifts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 space-y-1">
      {gifts.slice(-3).map((g) => (
        <div
          key={g.id}
          className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-ink backdrop-blur"
        >
          <span>{g.giftIcon}</span>
          <span className="font-semibold">{g.fromName}</span>
          <span className="text-mist">sent</span>
          <span className="font-semibold text-gold">{g.giftName}</span>
        </div>
      ))}
    </div>
  );
}
