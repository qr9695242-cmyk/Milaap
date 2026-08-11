"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { VIP_TIERS, vipLevelForSpend, nextVipTier, vipBands } from "@/lib/vip";
import BottomNav from "@/components/BottomNav";

export default function VipPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const spend = profile?.totalRechargedRs ?? 0;
  const current = vipLevelForSpend(spend);
  const next = nextVipTier(spend);
  const progressPct = next
    ? Math.round(((spend - current.minSpendRs) / (next.minSpendRs - current.minSpendRs)) * 100)
    : 100;

  const [selectedLevel, setSelectedLevel] = useState(current.level);
  const selected = VIP_TIERS[selectedLevel] || current;

  // Skip the "No VIP" placeholder for the grid — that's only shown in the hero.
  const paidTiers = useMemo(() => VIP_TIERS.filter((t) => t.level > 0), []);
  const bands = vipBands();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-28">
      <section
        className="px-5 pb-8 pt-10"
        style={{ background: `linear-gradient(135deg, ${current.color}55, #0B0713)` }}
      >
        <Link href="/profile" className="text-lg text-ink/80">←</Link>
        <p className="mt-2 text-xs text-mist">Your tier</p>
        <h1 className="font-display text-2xl font-extrabold text-ink" style={{ color: current.color }}>
          {current.name}
        </h1>
        <p className="mt-1 text-xs text-mist">Lifetime recharge: Rs {spend.toLocaleString()}</p>

        {next && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-panel">
              <div className="h-full bg-glow-gradient" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-mist">
              Rs {(next.minSpendRs - spend).toLocaleString()} more to reach {next.name}
            </p>
          </div>
        )}
      </section>

      {/* Selected level detail card — updates as you tap any badge below */}
      <section className="mx-5 mt-4">
        <div
          className={`rounded-2xl p-4 ring-1 ${selected.glow}`}
          style={{
            background: `linear-gradient(135deg, ${selected.color}33, #14101F)`,
            borderColor: selected.color,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-mist">{selected.band}</p>
              <p className="font-display text-lg font-extrabold" style={{ color: selected.color }}>
                {selected.name}
              </p>
            </div>
            {selected.level === current.level ? (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-ink">Current</span>
            ) : selected.level < current.level ? (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-mist">Unlocked</span>
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-mist">🔒 Locked</span>
            )}
          </div>
          <p className="mt-2 text-xs text-mist">Rs {selected.minSpendRs.toLocaleString()}+ lifetime recharge</p>
          {selected.emojis.length > 0 && (
            <p className="mt-2 text-sm">{selected.emojis.join(" ")}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-mist">
            <span className={`rounded-full px-2 py-1 ring-1 ${selected.entryEffect ? "ring-white/20 text-ink" : "ring-white/5"}`}>
              {selected.entryEffect ? "✓" : "✗"} Room entry effect
            </span>
            <span className={`rounded-full px-2 py-1 ring-1 ${selected.prioritySeat ? "ring-white/20 text-ink" : "ring-white/5"}`}>
              {selected.prioritySeat ? "✓" : "✗"} Priority seat
            </span>
          </div>
        </div>
      </section>

      {/* Full 1–200 level path, grouped by band — each badge gets more premium as bands climb */}
      <section className="mx-5 mt-6 space-y-6">
        {bands.map((band) => {
          const tiersInBand = paidTiers.filter((t) => t.level >= band.from && t.level <= band.to);
          return (
            <div key={band.name}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: band.color }} />
                <p className="text-xs font-bold" style={{ color: band.color }}>
                  {band.name}
                </p>
                <p className="text-[10px] text-mist">
                  Lv.{band.from}–{band.to}
                </p>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {tiersInBand.map((tier) => {
                  const unlocked = tier.level <= current.level;
                  const isCurrent = tier.level === current.level;
                  return (
                    <button
                      key={tier.level}
                      onClick={() => setSelectedLevel(tier.level)}
                      className={`aspect-square rounded-lg text-[10px] font-bold ring-1 transition ${
                        isCurrent
                          ? "ring-2"
                          : selectedLevel === tier.level
                          ? "ring-white/40"
                          : "ring-white/5"
                      } ${unlocked ? tier.glow : "opacity-35"}`}
                      style={{
                        backgroundColor: unlocked ? `${tier.color}33` : "#1A1626",
                        color: unlocked ? tier.color : "#5C5570",
                        borderColor: isCurrent ? tier.color : undefined,
                      }}
                    >
                      {tier.level}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
