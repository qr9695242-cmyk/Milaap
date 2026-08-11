"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { effectiveRole, hasAtLeastRole, ROLES } from "@/lib/roles";
import { getAnalyticsSnapshot } from "@/lib/analytics";

export default function AnalyticsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const role = effectiveRole(user, profile);
  const isAdmin = hasAtLeastRole(role, ROLES.ADMIN);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    getAnalyticsSnapshot()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [isAdmin]);

  if (loading || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const cards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers },
        { label: "New Users Today", value: stats.newUsersToday },
        { label: "Live Rooms Now", value: stats.liveRoomsNow },
        { label: "Pending Recharges", value: stats.pendingRecharges },
        { label: "Total Revenue", value: `Rs ${stats.totalRevenueRs.toLocaleString()}` },
        { label: "Approved Recharges", value: stats.approvedRechargeCount },
        { label: "Total Families", value: stats.totalFamilies },
        { label: "Pending Reports", value: stats.pendingReports },
      ]
    : [];

  return (
    <main className="min-h-screen bg-void px-5 pb-16 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold text-ink">Analytics Dashboard</h1>
        <Link href="/admin" className="text-xs text-mist">← Admin Panel</Link>
      </div>

      {error && <p className="mt-4 text-xs text-neon-pink">{error}</p>}

      {!stats && !error && <p className="mt-6 text-xs text-mist">Loading numbers…</p>}

      <div className="mt-6 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-panel p-4 ring-1 ring-white/5">
            <p className="font-display text-xl font-extrabold text-ink">{c.value}</p>
            <p className="mt-1 text-[11px] text-mist">{c.label}</p>
          </div>
        ))}
      </div>

      {stats?.pendingReports > 0 && (
        <p className="mt-4 rounded-xl bg-neon-pink/10 p-3 text-center text-xs text-neon-pink">
          {stats.pendingReports} report(s) waiting for review in the Admin Panel.
        </p>
      )}
    </main>
  );
}
