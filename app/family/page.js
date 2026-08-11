"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenFamilyLeaderboard, createFamily, joinFamily } from "@/lib/family";
import BottomNav from "@/components/BottomNav";

export default function FamilyBrowsePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [families, setFamilies] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenFamilyLeaderboard(setFamilies);
    return () => unsub();
  }, []);

  // Already in a family? Go straight to it.
  useEffect(() => {
    if (profile?.familyId) router.replace(`/family/${profile.familyId}`);
  }, [profile?.familyId, router]);

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await createFamily({
        name: name.trim(),
        leaderId: user.uid,
        leaderName: profile?.displayName || "User",
      });
      router.push(`/family/${id}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(family) {
    await joinFamily(family.id, user.uid, profile?.displayName || "User");
    router.push(`/family/${family.id}`);
  }

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
          <Link href="/profile" className="text-lg text-ink/80">←</Link>
          <h1 className="font-display text-xl font-extrabold text-ink">Families</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-glow-gradient px-4 py-2 text-xs font-semibold text-ink shadow-glow"
        >
          + Create
        </button>
      </header>

      <section className="mx-5 mt-5 space-y-2">
        {families.length === 0 ? (
          <p className="text-xs text-mist">No families yet — start the first one.</p>
        ) : (
          families.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-xs text-mist">#{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{f.name}</p>
                  <p className="text-xs text-mist">
                    Lv.{f.level} · {f.members?.length ?? 0} members · ◆ {f.totalDiamonds}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleJoin(f)}
                className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10"
              >
                Join
              </button>
            </div>
          ))
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-2xl bg-panel p-5">
            <h2 className="font-display text-lg font-bold text-ink">Create a family</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Family name"
              className="mt-4 w-full rounded-lg bg-panel2 px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
            />
            <button
              onClick={handleCreate}
              disabled={busy}
              className="mt-4 w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create Family"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-3 w-full py-2 text-center text-xs text-mist"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
