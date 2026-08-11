"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { listenBlockedList, unblockUser } from "@/lib/block";

export default function BlockedUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return listenBlockedList(user.uid, setRows);
  }, [user]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pb-10">
      <header className="flex items-center gap-3 px-5 pt-6">
        <Link href="/profile" className="text-lg text-ink/80">←</Link>
        <h1 className="font-display text-xl font-extrabold text-ink">Blocked Users</h1>
      </header>

      <section className="mx-5 mt-4 space-y-2">
        {rows.length === 0 && (
          <p className="mt-10 text-center text-sm text-mist">You haven't blocked anyone.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-ink">
                {(r.blockedName || "U").charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-ink">{r.blockedName}</p>
            </div>
            <button
              onClick={() => unblockUser(user.uid, r.blockedId)}
              className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-ink"
            >
              Unblock
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
