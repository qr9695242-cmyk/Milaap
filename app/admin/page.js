"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { effectiveRole, hasAtLeastRole, setUserRole, ROLES } from "@/lib/roles";
import {
  listenPendingRecharges,
  approveRecharge,
  rejectRecharge,
  listenPendingWithdrawals,
  approveWithdraw,
  rejectWithdraw,
} from "@/lib/wallet";
import { listenActiveRooms, endRoom } from "@/lib/rooms";
import { listenPendingReports, resolveReport } from "@/lib/moderation";

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [recharges, setRecharges] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reports, setReports] = useState([]);
  const [listenerErrors, setListenerErrors] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [roleTargetUid, setRoleTargetUid] = useState("");
  const [roleToGrant, setRoleToGrant] = useState(ROLES.MODERATOR);
  const [roleMessage, setRoleMessage] = useState(null);

  const role = effectiveRole(user, profile);
  const isAdmin = hasAtLeastRole(role, ROLES.ADMIN);
  const isModerator = hasAtLeastRole(role, ROLES.MODERATOR);
  const isSuperAdmin = role === ROLES.SUPERADMIN;

  useEffect(() => {
    if (!loading && !isModerator) router.replace("/");
  }, [loading, isModerator, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const setErr = (key) => (err) =>
      setListenerErrors((prev) => ({ ...prev, [key]: err?.message || String(err) }));
    const unsub1 = listenPendingRecharges(setRecharges, setErr("recharges"));
    const unsub2 = listenActiveRooms(setRooms, setErr("rooms"));
    const unsub3 = listenPendingWithdrawals(setWithdrawals, setErr("withdrawals"));
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isModerator) return;
    return listenPendingReports(setReports, (err) =>
      setListenerErrors((prev) => ({ ...prev, reports: err?.message || String(err) }))
    );
  }, [isModerator]);

  async function handleGrantRole(e) {
    e.preventDefault();
    setRoleMessage(null);
    try {
      await setUserRole(roleTargetUid.trim(), roleToGrant);
      setRoleMessage(`Role updated to "${roleToGrant}" for that user.`);
      setRoleTargetUid("");
    } catch (err) {
      setRoleMessage(err.message);
    }
  }

  async function handleResolveReport(reportId, status) {
    setBusyId(reportId);
    try {
      await resolveReport(reportId, status);
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(req) {
    setBusyId(req.id);
    try {
      await approveRecharge(req);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(req) {
    setBusyId(req.id);
    try {
      await rejectRecharge(req.id);
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveWithdraw(req) {
    setBusyId(req.id);
    try {
      await approveWithdraw(req.id);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectWithdraw(req) {
    setBusyId(req.id);
    try {
      await rejectWithdraw(req);
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !isModerator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void px-5 pb-16 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/profile" className="text-lg text-ink/80">←</Link>
          <h1 className="font-display text-xl font-extrabold text-ink">Admin Panel</h1>
          <p className="text-xs text-mist">
            Signed in as {user.email} · role: {role}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/analytics"
            className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-diamond ring-1 ring-diamond/30"
          >
            Analytics
          </Link>
        )}
      </div>

      {isAdmin && (
        <section className="mt-6">
          <h2 className="font-display text-sm font-bold text-ink">
            Pending Recharges ({recharges.length})
          </h2>
          {listenerErrors.recharges && (
            <p className="mt-2 text-xs text-neon-pink">
              ⚠ Load nahi ho saka: {listenerErrors.recharges}. Agar "index" ka
              zikar ho to console (F12) mein Firestore ka link click karein.
            </p>
          )}
          {recharges.length === 0 ? (
            <p className="mt-3 text-xs text-mist">Nothing pending.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recharges.map((r) => (
                <div key={r.id} className="rounded-xl bg-panel p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-mist">
                        ● {r.coins} coins · Rs {r.priceRs} · {r.method}
                      </p>
                      {r.reference && (
                        <p className="text-xs text-mist">Ref: {r.reference}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={busyId === r.id}
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(r)}
                        disabled={busyId === r.id}
                        className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-bold text-ink">
            Pending Withdrawals ({withdrawals.length})
          </h2>
          {listenerErrors.withdrawals && (
            <p className="mt-2 text-xs text-neon-pink">
              ⚠ Load nahi ho saka: {listenerErrors.withdrawals}
            </p>
          )}
          {withdrawals.length === 0 ? (
            <p className="mt-3 text-xs text-mist">Nothing pending.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="rounded-xl bg-panel p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">{w.name}</p>
                      <p className="text-xs text-mist">
                        ◆ {w.diamonds} diamonds → Rs {w.payoutRs} · {w.method}
                      </p>
                      <p className="text-xs text-mist">Account: {w.accountNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveWithdraw(w)}
                        disabled={busyId === w.id}
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => handleRejectWithdraw(w)}
                        disabled={busyId === w.id}
                        className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30 disabled:opacity-60"
                      >
                        Reject & Refund
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-bold text-ink">
            Live Rooms ({rooms.length})
          </h2>
          {listenerErrors.rooms && (
            <p className="mt-2 text-xs text-neon-pink">
              ⚠ Load nahi ho saka: {listenerErrors.rooms}
            </p>
          )}
          {rooms.length === 0 ? (
            <p className="mt-3 text-xs text-mist">Nothing live right now.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-panel p-3 ring-1 ring-white/5"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.title}</p>
                    <p className="text-xs text-mist">
                      {r.type} · hosted by {r.hostName}
                    </p>
                  </div>
                  <button
                    onClick={() => endRoom(r.id)}
                    className="rounded-full bg-neon-pink/20 px-3 py-1.5 text-xs font-semibold text-neon-pink"
                  >
                    Force End
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-sm font-bold text-ink">
          Pending Reports ({reports.length})
        </h2>
        {listenerErrors.reports && (
          <p className="mt-2 text-xs text-neon-pink">
            ⚠ Load nahi ho saka: {listenerErrors.reports}
          </p>
        )}
        {reports.length === 0 ? (
          <p className="mt-3 text-xs text-mist">Nothing to review.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="rounded-xl bg-panel p-3 ring-1 ring-white/5">
                <p className="text-sm font-semibold text-ink">
                  Reported: {r.targetName || r.targetUid}
                </p>
                <p className="text-xs text-mist">
                  By {r.reporterName || r.reporterUid} · {r.reason || "No reason given"}
                </p>
                {r.details && <p className="mt-1 text-xs text-mist">"{r.details}"</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleResolveReport(r.id, "resolved")}
                    disabled={busyId === r.id}
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleResolveReport(r.id, "dismissed")}
                    disabled={busyId === r.id}
                    className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-mist ring-1 ring-white/10 disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isSuperAdmin && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-bold text-ink">Manage Team Roles</h2>
          <p className="mt-1 text-xs text-mist">
            Grant moderator or admin access to another user by their UID (find it on their
            profile page URL: /u/&lt;uid&gt;).
          </p>
          <form onSubmit={handleGrantRole} className="mt-3 space-y-2 rounded-xl bg-panel p-3 ring-1 ring-white/5">
            <input
              value={roleTargetUid}
              onChange={(e) => setRoleTargetUid(e.target.value)}
              placeholder="Target user UID"
              className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
            />
            <select
              value={roleToGrant}
              onChange={(e) => setRoleToGrant(e.target.value)}
              className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
            >
              <option value={ROLES.MODERATOR}>Moderator</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.USER}>Revoke (back to User)</option>
            </select>
            <button className="w-full rounded-full bg-glow-gradient py-2.5 text-sm font-bold text-ink">
              Update Role
            </button>
            {roleMessage && <p className="text-xs text-mist">{roleMessage}</p>}
          </form>
        </section>
      )}
    </main>
  );
}
