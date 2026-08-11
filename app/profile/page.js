"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { vipLevelForSpend } from "@/lib/vip";
import { hostLevelForDiamonds } from "@/lib/hostLevel";
import { giftLevelForCoins, nextGiftLevel } from "@/lib/giftLevel";
import { effectiveRole } from "@/lib/roles";
import { findItem } from "@/lib/decorations";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import FramedAvatar from "@/components/FramedAvatar";
import PremiumCard from "@/components/PremiumCard";

export default function ProfilePage() {
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

  const role = effectiveRole(user, profile);
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperAdmin = role === "superadmin";
  const vipTier = vipLevelForSpend(profile?.totalRechargedRs);
  const hostTier = hostLevelForDiamonds(profile?.diamonds);
  const equippedVehicle = profile?.equippedVehicle ? findItem("vehicle", profile.equippedVehicle) : null;

  const gifted = profile?.totalCoinsGifted ?? 0;
  const giftTier = giftLevelForCoins(gifted);
  const nextGift = nextGiftLevel(gifted);
  const giftProgressPct = nextGift
    ? Math.round(((gifted - giftTier.minCoins) / (nextGift.minCoins - giftTier.minCoins)) * 100)
    : 100;

  return (
    <main className="min-h-screen bg-void pb-28">
      <section className="profile-hero px-5 pb-9 pt-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <FramedAvatar frameId={profile?.equippedFrame} name={profile?.displayName} photoURL={profile?.photoURL || profile?.avatar} size={76} />
            <div>
              <p className="font-display text-lg font-extrabold text-ink">
                {profile?.displayName || "User"} {equippedVehicle && <span title={equippedVehicle.name}>{equippedVehicle.emoji}</span>}
              </p>
              <p className="text-xs text-ink/80">{profile?.email}</p>
              {profile?.gender && (
                <p className="mt-0.5 text-[10px] text-ink/60">
                  {profile.gender === "male" ? "♂ Male" : profile.gender === "female" ? "♀ Female" : ""}
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-ink">
                  {vipTier.name}
                </span>
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-ink">
                  {hostTier.icon} {hostTier.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-ink ring-1 ring-white/20 active:scale-95"
            >
              ✎ Edit Profile
            </Link>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-3 text-xs leading-relaxed text-ink/75">{profile.bio}</p>
        )}
      </section>

      <section className="premium-card mx-5 -mt-5 flex divide-x divide-white/5">
        <Link href={`/u/${user.uid}/connections?tab=followers`} className="flex-1 py-3 text-center">
          <p className="font-display text-base font-extrabold text-ink">{profile?.followersCount ?? 0}</p>
          <p className="text-[10px] text-mist">Followers</p>
        </Link>
        <Link href={`/u/${user.uid}/connections?tab=following`} className="flex-1 py-3 text-center">
          <p className="font-display text-base font-extrabold text-ink">{profile?.followingCount ?? 0}</p>
          <p className="text-[10px] text-mist">Following</p>
        </Link>
        <div className="flex-1 py-3 text-center">
          <p className="font-display text-base font-extrabold text-gold">◆ {profile?.diamonds ?? 0}</p>
          <p className="text-[10px] text-mist">Diamonds</p>
        </div>
        <div className="flex-1 py-3 text-center">
          <p className="font-display text-base font-extrabold text-diamond">● {profile?.coins ?? 0}</p>
          <p className="text-[10px] text-mist">Coins</p>
        </div>
      </section>

      <Link
        href="/gift-level"
        className="premium-card mx-5 mt-4 block p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Gift Level</p>
          <p className="text-[11px] text-mist">● {gifted.toLocaleString()} gifted</p>
        </div>
        <span
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${giftTier.color}22`, color: giftTier.color }}
        >
          {giftTier.icon} Lv.{giftTier.level} {giftTier.name}
        </span>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel2">
          <div className="h-full bg-glow-gradient" style={{ width: `${giftProgressPct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-mist">
          {nextGift
            ? `Lv.${nextGift.level} tak ${(nextGift.minCoins - gifted).toLocaleString()} coins ka gift aur bhejna hai`
            : "Max gift level reached 🔥"}
        </p>
      </Link>

      <section className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <Link href="/wallet/recharge" className="premium-card p-4 active:scale-[.98]">
          <div className="flex items-center justify-between"><span className="text-2xl">💰</span><span className="premium-chip text-gold">18 PACKS</span></div>
          <p className="mt-3 text-sm font-black text-ink">Buy Coins</p>
          <p className="mt-1 text-[10px] text-mist">Premium coin packs up to 3B</p>
        </Link>
        <Link href="/store" className="premium-card p-4 active:scale-[.98]">
          <div className="flex items-center justify-between"><span className="text-2xl">✨</span><span className="premium-chip text-diamond">STORE</span></div>
          <p className="mt-3 text-sm font-black text-ink">Premium Store</p>
          <p className="mt-1 text-[10px] text-mist">Frames • rides • gifts • games</p>
        </Link>
      </section>

      <section className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <Link href="/profile/frames" className="premium-card p-4 active:scale-[.98]">
          <div className="flex items-center justify-between"><span className="text-2xl">🖼️</span><span className="premium-chip text-gold">FRAME</span></div>
          <p className="mt-3 text-sm font-black text-ink">Profile Frame</p>
          <p className="mt-1 text-[10px] text-mist">Premium rings • animated styles</p>
        </Link>
        <Link href="/profile/vehicles" className="premium-card p-4 active:scale-[.98]">
          <div className="flex items-center justify-between"><span className="text-2xl">🚘</span><span className="premium-chip text-diamond">RIDE</span></div>
          <p className="mt-3 text-sm font-black text-ink">Entry Vehicle</p>
          <p className="mt-1 text-[10px] text-mist">Show your ride when entering rooms</p>
        </Link>
      </section>

      <section className="mx-5 mt-6 overflow-hidden rounded-2xl bg-panel ring-1 ring-white/5">
        {[
          { label: "Wallet", icon: "💳", href: "/wallet" },
          { label: "Earn Cash", icon: "💵", href: "/earn-cash" },
          { label: "Invite Friends", icon: "👥", href: "/invite", badge: "Earn Coins" },
          { label: "SVIP", icon: "🛡️", href: "/vip", right: "Join now" },
          { label: "SVIP Settings", icon: "⚙️", href: "/vip/settings" },
          { label: "Gold Mine", icon: "⛏️", href: "/gold-mine", right: "Join Now" },
          { label: "Medal", icon: "🏅", href: "/medal" },
          { label: "Level", icon: "🔥", href: "/level" },
          { label: "CP/Friend", icon: "💗", href: "/profile/friends" },
          { label: "Family", icon: "👪", href: "/family", right: "Join Now" },
          { label: "Store", icon: "🛍️", href: "/store" },
          { label: "My Items", icon: "👕", href: "/items" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="flex min-h-[70px] items-center gap-4 border-b border-white/5 px-4 active:bg-white/5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel2 text-xl">{item.icon}</span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{item.label}</span>
            {item.badge ? <span className="rounded-full bg-gradient-to-r from-amber-200 to-yellow-300 px-3 py-1 text-[11px] font-bold text-void">🎁 {item.badge}</span> : item.right ? <span className="text-xs text-mist">{item.right}</span> : null}
            <span className="text-mist">›</span>
          </Link>
        ))}
      </section>

      <section className="premium-card mx-5 mt-3 overflow-hidden">
        {[
          { label: "🎮 18 Premium Games", href: "/games" },
          { label: "📺 Live Match • 6 Tables", href: "/live-match" },
          { label: "🎙️ Audio Match • 6 Tables", href: "/audio-match" },
          { label: "🌐 Language", href: "/language" },
        ].map((item) => <Link key={item.label} href={item.href} className="flex items-center justify-between border-b border-white/5 px-4 py-4 text-sm font-semibold text-ink"><span>{item.label}</span><span className="text-mist">›</span></Link>)}
      </section>

      {isAdmin && (
        <div className="mx-5 mt-4 space-y-2">
          <Link
            href="/admin"
            className="flex items-center justify-between rounded-xl bg-panel px-4 py-3 text-sm font-semibold text-gold ring-1 ring-gold/30"
          >
            Admin Panel
            <span>›</span>
          </Link>
          <Link
            href="/admin/analytics"
            className="flex items-center justify-between rounded-xl bg-panel px-4 py-3 text-sm font-semibold text-diamond ring-1 ring-diamond/30"
          >
            Analytics Dashboard
            <span>›</span>
          </Link>
          {isSuperAdmin && (
            <p className="px-1 text-[10px] text-mist">
              Signed in as Super Admin — you can manage other admins/moderators from the Admin Panel.
            </p>
          )}
        </div>
      )}

      <div className="mx-5 mt-6">
        <button
          onClick={() => signOut(auth)}
          className="w-full rounded-full bg-panel py-3 text-sm font-semibold text-neon-pink ring-1 ring-neon-pink/30"
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
