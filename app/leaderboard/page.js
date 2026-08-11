"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { listenTopEarners, listenTopSpenders } from "@/lib/leaderboard";
import { vipLevelForSpend } from "@/lib/vip";
import BottomNav from "@/components/BottomNav";
import HostLevelBadge from "@/components/HostLevelBadge";
import VipBadge from "@/components/VipBadge";

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("earners"); // earners | spenders
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const unsub =
      tab === "earners" ? listenTopEarners(setRows) : listenTopSpenders(setRows);
    return () => unsub();
  }, [tab]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="px-5 pt-6">
        <h1 className="font-display text-xl font-extrabold text-ink">Leaderboard</h1>
      </header>

      <div className="mx-5 mt-4 flex gap-2">
        <TabButton active={tab === "earners"} onClick={() => setTab("earners")}>
          Top Hosts
        </TabButton>
        <TabButton active={tab === "spenders"} onClick={() => setTab("spenders")}>
          Rich List
        </TabButton>
      </div>

      <section className="mx-5 mt-4 space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5"
          >
            <div className="flex items-center gap-3">
              <span className={`w-6 text-center font-display text-sm font-extrabold ${rankColor(i)}`}>
                {i + 1}
              </span>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-ink">{r.displayName}</p>
                  {tab === "earners" ? (
                    <HostLevelBadge diamonds={r.diamonds} compact />
                  ) : (
                    <VipBadge vipLevel={r.vipLevel} compact />
                  )}
                </div>
                <p className="text-xs text-mist">
                  {vipLevelForSpend(r.totalRechargedRs).name}
                </p>
              </div>
            </div>
            <span className={`text-sm font-bold ${tab === "earners" ? "text-gold" : "text-diamond"}`}>
              {tab === "earners" ? `◆ ${r.diamonds ?? 0}` : `Rs ${r.totalRechargedRs ?? 0}`}
            </span>
          </div>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-xs font-semibold ${
        active ? "bg-glow-gradient text-ink" : "bg-panel text-mist ring-1 ring-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function rankColor(i) {
  if (i === 0) return "text-gold";
  if (i === 1) return "text-ink";
  if (i === 2) return "text-neon-orange";
  return "text-mist";
}
