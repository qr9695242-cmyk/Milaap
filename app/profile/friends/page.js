"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import BottomNav from "@/components/BottomNav";
import {
  listenMyCp,
  listenIncomingCpRequests,
  acceptCpRequest,
  declineCpRequest,
  breakCp,
  cpLevelForDays,
  daysSince,
} from "@/lib/cp";
import {
  listenMyFriends,
  listenIncomingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  friendLevelForDays,
  MAX_FRIEND_SLOTS,
} from "@/lib/friends";

function Avatar({ url, name, size = 56 }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel2 font-bold text-ink ring-2 ring-white/20"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        (name || "U").charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function FriendsCpPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [cp, setCp] = useState(null);
  const [cpRequests, setCpRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      listenMyCp(user.uid, setCp),
      listenIncomingCpRequests(user.uid, setCpRequests),
      listenMyFriends(user.uid, setFriends),
      listenIncomingFriendRequests(user.uid, setFriendRequests),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const cpDays = cp ? daysSince(cp.startedAt) : 0;
  const cpLevel = cpLevelForDays(cpDays);
  const partnerName = cp ? (cp.uid1 === user.uid ? cp.name2 : cp.name1) : null;
  const partnerAvatar = cp ? (cp.uid1 === user.uid ? cp.avatar2 : cp.avatar1) : null;

  async function handleCpAction(action, arg) {
    setBusyId(arg.id || "cp");
    try {
      await action(arg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-void pb-28">
      <section className="bg-glow-gradient px-5 pb-6 pt-8">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-ink text-lg">‹</Link>
          <div>
            <h1 className="font-display text-lg font-extrabold text-ink">CP & Friends</h1>
            <p className="text-xs text-ink/80">Your closest connections on Milaap</p>
          </div>
        </div>
      </section>

      {/* CP card */}
      <section className="mx-5 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-ink">CP</h2>
          {!cp && (
            <Link href="/search" className="text-xs font-semibold text-neon-violet">
              Find a CP →
            </Link>
          )}
        </div>

        {cp ? (
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-gradient-to-br from-pink-500/90 to-fuchsia-600/90 p-4 shadow-glow">
            <div className="flex items-center gap-3">
              <Avatar url={partnerAvatar} name={partnerName} />
              <div>
                <p className="font-display text-sm font-bold text-white">{partnerName}</p>
                <p className="text-[11px] text-white/80">{cpDays} days together</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg">
                💚
              </div>
              <p className="mt-1 text-[10px] font-bold text-white">Lv.{cpLevel}</p>
              <button
                onClick={() => handleCpAction(breakCp, cp.id)}
                disabled={busyId === cp.id}
                className="mt-2 rounded-full bg-black/20 px-2 py-1 text-[9px] font-semibold text-white/90"
              >
                Break up
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 rounded-2xl bg-panel p-4 ring-1 ring-white/5">
            <p className="text-xs text-mist">
              You don't have a CP yet. Search for someone and send a CP request from their profile.
            </p>
          </div>
        )}

        {cpRequests.length > 0 && (
          <div className="mt-3 space-y-2">
            {cpRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-neon-pink/40"
              >
                <div className="flex items-center gap-2">
                  <Avatar url={r.fromAvatar} name={r.fromName} size={36} />
                  <p className="text-xs text-ink">
                    <span className="font-semibold">{r.fromName}</span> wants to be your CP 💞
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCpAction(acceptCpRequest, r)}
                    disabled={busyId === r.id}
                    className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-bold text-ink"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleCpAction((req) => declineCpRequest(req.id), r)}
                    disabled={busyId === r.id}
                    className="rounded-full bg-panel2 px-3 py-1 text-[10px] font-bold text-mist"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Friends grid */}
      <section className="mx-5 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-ink">
            Friends ({friends.length}/{MAX_FRIEND_SLOTS})
          </h2>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-3">
          {friends.map((f) => {
            const isMe1 = f.uid1 === user.uid;
            const name = isMe1 ? f.name2 : f.name1;
            const avatar = isMe1 ? f.avatar2 : f.avatar1;
            const days = daysSince(f.since);
            const lvl = friendLevelForDays(days);
            return (
              <div
                key={f.id}
                className="flex flex-col items-center rounded-xl bg-gradient-to-b from-fuchsia-500/80 to-pink-600/80 p-3 shadow-sm"
              >
                <span className="rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-bold text-white">
                  Lv.{lvl}
                </span>
                <div className="mt-2">
                  <Avatar url={avatar} name={name} size={48} />
                </div>
                <p className="mt-2 line-clamp-1 text-center text-[11px] font-semibold text-white">
                  {name}
                </p>
                <p className="text-[9px] text-white/80">🎗 {days} days</p>
                <button
                  onClick={() => handleCpAction(removeFriend, f.id)}
                  disabled={busyId === f.id}
                  className="mt-1 text-[9px] text-white/70 underline"
                >
                  Remove
                </button>
              </div>
            );
          })}

          {friends.length < MAX_FRIEND_SLOTS && (
            <Link
              href="/search"
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-panel p-3 ring-1 ring-dashed ring-white/15"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-panel2 text-2xl text-mist">
                +
              </span>
              <p className="text-[11px] font-semibold text-mist">Invite</p>
            </Link>
          )}
        </div>

        {friendRequests.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-mist">Friend requests</p>
            {friendRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5"
              >
                <div className="flex items-center gap-2">
                  <Avatar url={r.fromAvatar} name={r.fromName} size={36} />
                  <p className="text-xs text-ink">
                    <span className="font-semibold">{r.fromName}</span> wants to be friends
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCpAction(acceptFriendRequest, r)}
                    disabled={busyId === r.id}
                    className="rounded-full bg-glow-gradient px-3 py-1 text-[10px] font-bold text-ink"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleCpAction((req) => declineFriendRequest(req.id), r)}
                    disabled={busyId === r.id}
                    className="rounded-full bg-panel2 px-3 py-1 text-[10px] font-bold text-mist"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
