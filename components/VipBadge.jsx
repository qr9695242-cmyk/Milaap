import { VIP_TIERS } from "@/lib/vip";

/** Small pill: VIP 2 / SVIP — used on profiles, chat names, leaderboard rows. */
export default function VipBadge({ vipLevel = 0, compact = false }) {
  const tier = VIP_TIERS[Math.max(0, Math.min(vipLevel, VIP_TIERS.length - 1))];
  if (!tier || tier.level === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${tier.color}22`, color: tier.color }}
      title={tier.name}
    >
      {tier.level === 4 ? "★" : "◆"} {compact ? tier.name.replace(" ", "") : tier.name}
    </span>
  );
}
