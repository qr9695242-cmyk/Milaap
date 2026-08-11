"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { followUser, unfollowUser, listenIsFollowing } from "@/lib/follow";

/** target = { uid, displayName, avatar } — the user this button follows */
export default function FollowButton({ target, className = "" }) {
  const { user, profile } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !target?.uid) return;
    return listenIsFollowing(user.uid, target.uid, setFollowing);
  }, [user, target?.uid]);

  if (!user || user.uid === target?.uid) return null; // no follow-yourself button

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(user.uid, target.uid);
      } else {
        await followUser(
          { uid: user.uid, displayName: profile?.displayName, avatar: profile?.avatar },
          target
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
        following
          ? "bg-panel text-ink ring-1 ring-white/15"
          : "bg-glow-gradient text-ink"
      } ${className}`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
