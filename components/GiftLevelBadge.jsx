import { giftLevelForSpend } from "@/lib/giftLevel";

/**
 * 3D embossed metallic pill: 🔥 Lv.36 Legend Patron — used on profile, chat
 * names, leaderboard rows. Each tier gets its own metallic gradient sheet
 * (bronze → silver → gold → ... → immortal) with a raised bevel edge and a
 * light-sweep shine animation; the shine runs faster and the badge glows
 * as the level climbs, so the visual itself reads as "more premium".
 */
export default function GiftLevelBadge({ totalGiftedCoins = 0, compact = false }) {
  const tier = giftLevelForSpend(totalGiftedCoins);

  const style = {
    backgroundImage: tier.gradient,
    color: "#1a1305",
    "--badge-sheen-speed": tier.sheenSpeed,
  };

  if (compact) {
    return (
      <span
        className="badge-3d animate-badge-pop inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-extrabold"
        style={style}
        data-immortal={tier.isImmortal}
        title={tier.name}
      >
        <span className="relative z-[2] drop-shadow-sm">
          {tier.icon} Lv.{tier.level}
        </span>
      </span>
    );
  }

  return (
    <span
      className="badge-3d animate-badge-pop inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold tracking-wide"
      style={style}
      data-immortal={tier.isImmortal}
    >
      <span className="relative z-[2] drop-shadow-sm">
        {tier.icon} Lv.{tier.level} {tier.name}
      </span>
    </span>
  );
}
