"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenNotifications, markAsRead, markAllAsRead } from "@/lib/notifications";
import BottomNav from "@/components/BottomNav";

const ICONS = {
  follow: "👤",
  gift: "🎁",
  system: "📣",
  family: "👨‍👩‍👧",
  pk: "⚔️",
  withdraw: "💳",
};

function timeAgo(ts) {
  if (!ts) return "";
  const ms = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return listenNotifications(user.uid, setItems);
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg text-ink/80">←</Link>
          <h1 className="font-display text-xl font-extrabold text-ink">Notifications</h1>
        </div>
        {items.some((n) => !n.read) && (
          <button
            onClick={() => markAllAsRead(user.uid, items)}
            className="text-xs font-semibold text-diamond"
          >
            Mark all read
          </button>
        )}
      </header>

      <section className="mx-5 mt-4 space-y-2">
        {items.length === 0 && (
          <p className="mt-10 text-center text-sm text-mist">
            No notifications yet. When someone follows you or sends a gift, it'll show up here.
          </p>
        )}
        {items.map((n) => {
          const inner = (
            <div
              onClick={() => !n.read && markAsRead(user.uid, n.id)}
              className={`flex items-start gap-3 rounded-xl p-3 ring-1 ${
                n.read ? "bg-panel ring-white/5" : "bg-panel2 ring-neon-violet/40"
              }`}
            >
              <span className="text-lg">{ICONS[n.type] || "🔔"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink/90">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-mist">{n.body}</p>}
                <p className="mt-1 text-[10px] text-mist">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-neon-pink" />}
            </div>
          );
          return n.link ? (
            <Link key={n.id} href={n.link}>
              {inner}
            </Link>
          ) : (
            <div key={n.id}>{inner}</div>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
