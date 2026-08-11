"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { vipLevelForSpend } from "@/lib/vip";
import { blockUser, unblockUser, listenIsBlocked } from "@/lib/block";
import { sendFriendRequest } from "@/lib/friends";
import { sendCpRequest } from "@/lib/cp";
import OnlineDot from "@/components/OnlineDot";
import FollowButton from "@/components/FollowButton";
import ReportModal from "@/components/ReportModal";
import BottomNav from "@/components/BottomNav";

export default function PublicProfilePage() {
  const { uid } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [friendMsg, setFriendMsg] = useState("");
  const [cpMsg, setCpMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    // If this is my own profile, send them to the full /profile screen instead.
    if (user && uid === user.uid) router.replace("/profile");
  }, [user, uid, router]);

  useEffect(() => {
    return onSnapshot(doc(db, "users", uid), (snap) => {
      setTarget(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [uid]);

  useEffect(() => {
    if (!user) return;
    return listenIsBlocked(user.uid, uid, setIsBlocked);
  }, [user, uid]);

  if (loading || !user || !target) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const vipTier = vipLevelForSpend(target.totalRechargedRs);

  const me = { uid: user.uid, displayName: user.displayName, avatar: user.photoURL };
  const targetUser = { uid, displayName: target.displayName, avatar: target.avatar };

  const handleAddFriend = async () => {
    try {
      await sendFriendRequest(me, targetUser);
      setFriendMsg("Friend request sent!");
    } catch (e) {
      setFriendMsg(e.message);
    }
  };

  const handleAddCp = async () => {
    try {
      await sendCpRequest(me, targetUser);
      setCpMsg("CP request sent!");
    } catch (e) {
      setCpMsg(e.message);
    }
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    if (isBlocked) {
      await unblockUser(user.uid, uid);
    } else {
      await blockUser(user.uid, user.displayName || "User", { uid, displayName: target.displayName });
    }
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="flex items-center justify-between px-5 pt-6">
        <Link href="/search" className="text-lg text-ink/80">←</Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-panel text-ink ring-1 ring-white/5"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-10 w-44 overflow-hidden rounded-xl bg-panel2 ring-1 ring-white/10">
              <button
                onClick={toggleBlock}
                className="block w-full px-4 py-3 text-left text-sm text-ink/90 hover:bg-white/5"
              >
                {isBlocked ? "Unblock user" : "Block user"}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="block w-full px-4 py-3 text-left text-sm text-neon-pink hover:bg-white/5"
              >
                Report user
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="mx-5 mt-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-ink ring-2 ring-white/40">
            {(target.displayName || "U").charAt(0).toUpperCase()}
          </div>
          <OnlineDot lastActiveAt={target.lastActiveAt} className="absolute bottom-0 right-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold text-ink">
            {target.displayName || "User"}
          </p>
          <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-ink">
            {vipTier.name}
          </span>
        </div>
        <FollowButton target={{ uid, displayName: target.displayName, avatar: target.avatar }} />
      </section>

      <section className="mx-5 mt-3 flex gap-2">
        <button
          onClick={handleAddFriend}
          className="flex-1 rounded-full bg-panel px-3 py-2 text-xs font-semibold text-ink ring-1 ring-white/10"
        >
          🤝 Add Friend
        </button>
        <button
          onClick={handleAddCp}
          className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white"
        >
          💞 Request CP
        </button>
      </section>
      {(friendMsg || cpMsg) && (
        <p className="mx-5 mt-2 text-center text-xs text-diamond">{friendMsg || cpMsg}</p>
      )}

      <section className="mx-5 mt-6 flex divide-x divide-white/5 rounded-xl bg-panel ring-1 ring-white/5">
        <Link href={`/u/${uid}/connections?tab=followers`} className="flex-1 py-4 text-center">
          <p className="font-display text-lg font-extrabold text-ink">{target.followersCount ?? 0}</p>
          <p className="text-xs text-mist">Followers</p>
        </Link>
        <Link href={`/u/${uid}/connections?tab=following`} className="flex-1 py-4 text-center">
          <p className="font-display text-lg font-extrabold text-ink">{target.followingCount ?? 0}</p>
          <p className="text-xs text-mist">Following</p>
        </Link>
      </section>

      {isBlocked && (
        <p className="mx-5 mt-4 rounded-xl bg-panel p-3 text-center text-xs text-mist ring-1 ring-white/5">
          You've blocked this user. They've been removed from your followers.
        </p>
      )}

      {reportOpen && (
        <ReportModal target={{ uid, displayName: target.displayName }} onClose={() => setReportOpen(false)} />
      )}

      <BottomNav />
    </main>
  );
}
