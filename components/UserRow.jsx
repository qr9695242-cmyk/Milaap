"use client";

import Link from "next/link";
import OnlineDot from "./OnlineDot";
import FollowButton from "./FollowButton";
import HostLevelBadge from "./HostLevelBadge";
import VipBadge from "./VipBadge";

/** u = a users/{uid} doc (needs at least uid/id, displayName, avatar, lastActiveAt) */
export default function UserRow({ u, showFollow = true }) {
  const uid = u.uid || u.id;
  return (
    <div className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5">
      <Link href={`/u/${uid}`} className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-base font-bold text-ink">
            {(u.displayName || "U").charAt(0).toUpperCase()}
          </div>
          <OnlineDot lastActiveAt={u.lastActiveAt} className="absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <p className="truncate text-sm font-semibold text-ink">{u.displayName || "User"}</p>
            <HostLevelBadge diamonds={u.diamonds} compact />
            <VipBadge vipLevel={u.vipLevel} compact />
          </div>
          {typeof u.followersCount === "number" && (
            <p className="text-xs text-mist">{u.followersCount} followers</p>
          )}
        </div>
      </Link>
      {showFollow && <FollowButton target={{ uid, displayName: u.displayName, avatar: u.avatar }} />}
    </div>
  );
}
