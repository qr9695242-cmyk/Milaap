"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenUnreadCount } from "@/lib/notifications";

export default function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    return listenUnreadCount(user.uid, setUnread);
  }, [user]);

  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-panel text-base ring-1 ring-white/5"
      aria-label="Notifications"
    >
      🔔
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-neon-pink px-1 text-[10px] font-bold text-ink">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
