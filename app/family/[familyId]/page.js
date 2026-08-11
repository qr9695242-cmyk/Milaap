"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenFamily, contributeToFamily, leaveFamily, familyLevelForDiamonds } from "@/lib/family";
import BottomNav from "@/components/BottomNav";

const CONTRIBUTE_AMOUNTS = [50, 200, 1000];

export default function FamilyDetailPage() {
  const { familyId } = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [family, setFamily] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub = listenFamily(familyId, setFamily);
    return () => unsub();
  }, [familyId]);

  async function handleContribute(amount) {
    setError("");
    setBusy(true);
    try {
      await contributeToFamily(familyId, user.uid, amount);
    } catch (e) {
      setError(e.message || "Could not contribute.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    const me = family.members.find((m) => m.uid === user.uid);
    if (me) await leaveFamily(familyId, me);
    router.push("/family");
  }

  if (loading || !user || !family) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const nextLevelAt = { 1: 2000, 2: 10000, 3: 50000, 4: 200000 }[family.level];
  const isLeader = family.leaderId === user.uid;

  return (
    <main className="min-h-screen bg-void pb-28">
      <section className="bg-glow-gradient px-5 pb-6 pt-8">
        <Link href="/family" className="text-lg text-ink/80">←</Link>
        <h1 className="mt-2 font-display text-xl font-extrabold text-ink">{family.name}</h1>
        <p className="mt-1 text-xs text-ink/80">
          Level {family.level} · ◆ {family.totalDiamonds}
          {nextLevelAt ? ` · ${nextLevelAt - family.totalDiamonds} to next level` : " · Max level"}
        </p>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="font-display text-sm font-bold text-ink">Contribute Diamonds</h2>
        <p className="text-xs text-mist">You have ◆ {profile?.diamonds ?? 0}</p>
        {error && <p className="mt-2 text-xs text-neon-pink">{error}</p>}
        <div className="mt-3 flex gap-2">
          {CONTRIBUTE_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleContribute(amt)}
              disabled={busy}
              className="flex-1 rounded-xl bg-panel py-3 text-sm font-semibold text-ink ring-1 ring-white/5 disabled:opacity-60"
            >
              ◆ {amt}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-6">
        <h2 className="font-display text-sm font-bold text-ink">
          Members ({family.members?.length ?? 0})
        </h2>
        <div className="mt-3 space-y-2">
          {family.members?.map((m) => (
            <div
              key={m.uid}
              className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5"
            >
              <span className="text-sm text-ink">{m.name}</span>
              {m.uid === family.leaderId && (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold">
                  Leader
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {!isLeader && (
        <div className="mx-5 mt-6">
          <button
            onClick={handleLeave}
            className="w-full rounded-full bg-panel py-3 text-sm font-semibold text-neon-pink ring-1 ring-neon-pink/30"
          >
            Leave Family
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
