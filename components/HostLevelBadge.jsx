import { hostLevelForDiamonds } from "@/lib/hostLevel";

/** Small pill: 🥇 Gold Host — used on profiles, chat names, leaderboard rows. */
export default function HostLevelBadge({ diamonds = 0, compact = false }) {
  const tier = hostLevelForDiamonds(diamonds);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: `${tier.color}22`, color: tier.color }}
        title={tier.name}
      >
        {tier.icon} Lv.{tier.level}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: `${tier.color}22`, color: tier.color }}
    >
      {tier.icon} {tier.name}
    </span>
  );
}
