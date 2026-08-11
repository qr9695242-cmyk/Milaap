"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { VIP_TIERS, vipLevelForSpend, nextVipTier } from "@/lib/vip";
import BottomNav from "@/components/BottomNav";

export default function VipPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const spend = profile?.totalRechargedRs ?? 0;
  const current = vipLevelForSpend(spend);
  const next = nextVipTier(spend);
  const progressPct = next
    ? Math.round(((spend - current.minSpendRs) / (next.minSpendRs - current.minSpendRs)) * 100)
    : 100;

  return (
    <main className="min-h-screen bg-void pb-28">
      <section
        className="px-5 pb-8 pt-10"
        style={{ background: `linear-gradient(135deg, ${current.color}55, #0B0713)` }}
      >
        <Link href="/profile" className="text-lg text-ink/80">←</Link>
        <p className="mt-2 text-xs text-mist">Your tier</p>
        <h1 className="font-display text-2xl font-extrabold text-ink">{current.name}</h1>
        <p className="mt-1 text-xs text-mist">Lifetime recharge: Rs {spend}</p>

        {next && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-panel">
              <div
                className="h-full bg-glow-gradient"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-mist">
              Rs {next.minSpendRs - spend} more to reach {next.name}
            </p>
          </div>
        )}
      </section>

      <section className="mx-5 mt-4 space-y-3">
        {VIP_TIERS.map((tier) => (
          <div
            key={tier.level}
            className={`flex items-center justify-between rounded-xl p-4 ring-1 ${
              tier.level === current.level
                ? "bg-panel ring-white/30"
                : "bg-panel/60 ring-white/5"
            }`}
          >
            <div>
              <p className="font-display text-sm font-bold" style={{ color: tier.color }}>
                {tier.name}
              </p>
              <p className="text-xs text-mist">Rs {tier.minSpendRs}+ lifetime recharge</p>
            </div>
            {tier.level === current.level && (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-ink">
                Current
              </span>
            )}
          </div>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
