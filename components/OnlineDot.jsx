"use client";

import { isOnline } from "@/lib/presence";

/** Green dot if lastActiveAt is recent, else a dim grey dot. */
export default function OnlineDot({ lastActiveAt, className = "" }) {
  const online = isOnline(lastActiveAt);
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-void ${
        online ? "bg-emerald-400" : "bg-white/20"
      } ${className}`}
      title={online ? "Online" : "Offline"}
    />
  );
}
