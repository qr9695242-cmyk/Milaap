"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { createAgency, joinAgencyByCode, leaveAgency, listenAgency, listenAgencyMembers } from "@/lib/agency";
import BottomNav from "@/components/BottomNav";
import HostLevelBadge from "@/components/HostLevelBadge";

export default function AgencyPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [agency, setAgency] = useState(null);
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile?.agencyId) {
      setAgency(null);
      setMembers([]);
      return;
    }
    const unsub1 = listenAgency(profile.agencyId, setAgency);
    const unsub2 = listenAgencyMembers(profile.agencyId, setMembers);
    return () => {
      unsub1();
      unsub2();
    };
  }, [profile?.agencyId]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createAgency(user.uid, profile.displayName, name.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await joinAgencyByCode(user.uid, code.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    try {
      await leaveAgency(user.uid, profile.agencyId);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const isLeader = agency?.leaderId === user.uid;
  const totalDiamonds = members.reduce((sum, m) => sum + (m.diamonds || 0), 0);

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="px-5 pt-6">
        <Link href="/profile" className="text-lg text-ink/80">←</Link>
        <h1 className="mt-2 font-display text-xl font-extrabold text-ink">Agency</h1>
        <p className="text-xs text-mist">Group hosts together and track their earnings.</p>
      </header>

      {error && (
        <p className="mx-5 mt-4 rounded-xl bg-neon-pink/10 p-3 text-center text-xs text-neon-pink">{error}</p>
      )}

      {!profile?.agencyId ? (
        <div className="mx-5 mt-6 space-y-6">
          <form onSubmit={handleCreate} className="rounded-xl bg-panel p-4 ring-1 ring-white/5">
            <h2 className="font-display text-sm font-bold text-ink">Start an Agency</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agency name"
              className="mt-3 w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
            />
            <button
              disabled={busy}
              className="mt-3 w-full rounded-full bg-glow-gradient py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            >
              Create Agency
            </button>
          </form>

          <form onSubmit={handleJoin} className="rounded-xl bg-panel p-4 ring-1 ring-white/5">
            <h2 className="font-display text-sm font-bold text-ink">Join with a Code</h2>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-character code"
              className="mt-3 w-full rounded-lg bg-panel2 px-3 py-2 text-sm uppercase text-ink outline-none ring-1 ring-white/10"
            />
            <button
              disabled={busy}
              className="mt-3 w-full rounded-full bg-panel2 py-2.5 text-sm font-bold text-ink ring-1 ring-white/10 disabled:opacity-50"
            >
              Join Agency
            </button>
          </form>
        </div>
      ) : (
        <div className="mx-5 mt-6">
          <div className="rounded-xl bg-glow-gradient p-4">
            <p className="font-display text-lg font-extrabold text-ink">{agency?.name || "…"}</p>
            <p className="text-xs text-ink/80">
              {isLeader ? "You lead this agency" : `Led by ${agency?.leaderName}`}
            </p>
            {isLeader && agency && (
              <p className="mt-2 rounded-full bg-white/20 inline-block px-3 py-1 text-xs font-semibold text-ink">
                Invite code: {agency.code}
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-xl bg-panel p-3 text-center ring-1 ring-white/5">
              <p className="font-display text-base font-extrabold text-ink">{members.length}</p>
              <p className="text-[10px] text-mist">Hosts</p>
            </div>
            <div className="flex-1 rounded-xl bg-panel p-3 text-center ring-1 ring-white/5">
              <p className="font-display text-base font-extrabold text-gold">◆ {totalDiamonds}</p>
              <p className="text-[10px] text-mist">Total Diamonds</p>
            </div>
          </div>

          <h2 className="mt-6 font-display text-sm font-bold text-ink">Hosts</h2>
          <div className="mt-3 space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{m.displayName}</p>
                  <HostLevelBadge diamonds={m.diamonds} compact />
                </div>
                <span className="text-xs font-bold text-gold">◆ {m.diamonds ?? 0}</span>
              </div>
            ))}
          </div>

          {!isLeader && (
            <button
              onClick={handleLeave}
              disabled={busy}
              className="mt-6 w-full rounded-full bg-panel py-3 text-sm font-semibold text-neon-pink ring-1 ring-neon-pink/30 disabled:opacity-50"
            >
              Leave Agency
            </button>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
