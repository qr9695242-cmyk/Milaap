"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenConversations, getUserProfile } from "@/lib/dm";
import { isOnline } from "@/lib/presence";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

function timeLabel(ts) {
  if (!ts) return "";
  const ms = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState({});

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    return listenConversations(user.uid, async (rows) => {
      setConversations(rows);
      const ids = [...new Set(rows.flatMap((r) => (r.members || []).filter((id) => id !== user.uid)))];
      const profiles = await Promise.all(ids.map((id) => getUserProfile(id)));
      setPeople((prev) => ({ ...prev, ...Object.fromEntries(profiles.filter(Boolean).map((p) => [p.uid, p])) }));
    });
  }, [user]);

  if (loading || !user) return <main className="flex min-h-screen items-center justify-center bg-void text-mist">Loading…</main>;
  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-void/85 px-5 pb-4 pt-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-[.22em] text-fuchsia-300">Social inbox</p><h1 className="mt-1 font-display text-2xl font-extrabold text-white">Messages</h1></div>
          <NotificationBell />
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 p-3">
          <p className="text-xs font-semibold text-white">Chat live, voice notes & room invites</p><p className="mt-1 text-[11px] text-white/50">Apni conversations real-time mein dekhein.</p>
        </div>
      </header>
      <section className="px-4 pt-3">
        {conversations.length === 0 ? (
          <div className="mx-1 mt-16 rounded-3xl border border-white/8 bg-panel p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-cyan-400/20 text-3xl">💬</div>
            <h2 className="mt-4 font-display text-lg font-bold text-white">No chats yet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Kisi user ke profile se message start karein. New messages yahan instantly appear honge.</p>
            <Link href="/search" className="mt-5 inline-flex rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-fuchsia-500/20">Find people</Link>
          </div>
        ) : <div className="space-y-2">{conversations.map((c) => {
          const otherId = (c.members || []).find((id) => id !== user.uid); const p = people[otherId] || {}; const online = isOnline(p.lastActiveAt);
          return <button key={c.id} onClick={() => router.push(`/messages/${c.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-white/6 bg-panel p-3 text-left transition hover:border-white/10 active:scale-[.99]">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-400/25 text-lg font-bold text-white">{p.photoURL ? <img src={p.photoURL} alt="" className="h-full w-full object-cover" /> : (p.displayName || "U").slice(0, 1).toUpperCase()}{online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-panel bg-emerald-400" />}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-white">{p.displayName || "User"}</p><span className="text-[10px] text-white/35">{timeLabel(c.updatedAt)}</span></div><p className="mt-1 truncate text-xs text-white/45">{c.lastMessage || "Start a conversation"}</p></div><span className="text-white/25">›</span>
          </button>;
        })}</div>}
      </section><BottomNav />
    </main>
  );
}
