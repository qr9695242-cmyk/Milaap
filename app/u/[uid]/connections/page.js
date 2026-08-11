"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenFollowers, listenFollowing } from "@/lib/follow";
import UserRow from "@/components/UserRow";

export default function ConnectionsPage() {
  const { uid } = useParams();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(searchParams.get("tab") === "following" ? "following" : "followers");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub =
      tab === "followers"
        ? listenFollowers(uid, (edges) =>
            setRows(edges.map((e) => ({ id: e.followerId, displayName: e.followerName, avatar: e.followerAvatar })))
          )
        : listenFollowing(uid, (edges) =>
            setRows(edges.map((e) => ({ id: e.followingId, displayName: e.followingName, avatar: e.followingAvatar })))
          );
    return () => unsub();
  }, [tab, uid]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-10">
      <header className="flex items-center gap-3 px-5 pt-6">
        <Link href={`/u/${uid}`} className="text-lg text-ink/80">←</Link>
        <h1 className="font-display text-xl font-extrabold text-ink">Connections</h1>
      </header>

      <div className="mx-5 mt-4 flex gap-2">
        {["followers", "following"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? "bg-glow-gradient text-ink" : "bg-panel text-mist ring-1 ring-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="mx-5 mt-4 space-y-2">
        {rows.length === 0 && (
          <p className="mt-10 text-center text-sm text-mist">No {tab} yet.</p>
        )}
        {rows.map((r) => (
          <UserRow key={r.id} u={r} />
        ))}
      </section>
    </main>
  );
}
