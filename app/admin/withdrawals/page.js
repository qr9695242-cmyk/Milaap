"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function AdminWithdrawalsPage() {
  const { user, profile, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [refs, setRefs] = useState({});

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin" || profile?.isAdmin === true;

  useEffect(() => {
    if (!user || !isAdmin) return;
    const q = query(collection(db, "withdrawalRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (e) => setError(e.message));
  }, [user, isAdmin]);

  async function call(name, data) {
    setBusy(data.requestId);
    setError("");
    try {
      const fn = httpsCallable(getFunctions(auth.currentUser.app), name);
      await fn(data);
    } catch (e) {
      setError(e?.message || "Action failed.");
    } finally { setBusy(""); }
  }

  if (loading) return <main className="min-h-screen p-6">Loading…</main>;
  if (!isAdmin) return <main className="min-h-screen p-6">Admin access required.</main>;

  return (
    <main className="min-h-screen bg-void px-4 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <div className="premium-card p-5">
          <h1 className="font-display text-2xl font-extrabold">Manual Withdrawals</h1>
          <p className="mt-1 text-sm text-mist">Pay the user yourself through JazzCash, Easypaisa or bank, then record the transaction ID here. No payment API is used.</p>
          {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        </div>

        <div className="mt-5 grid gap-4">
          {items.length === 0 && <div className="premium-card p-6 text-sm text-mist">No withdrawal requests yet.</div>}
          {items.map((x) => (
            <div key={x.id} className="premium-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black">Request {x.id}</div>
                  <div className="mt-1 text-xs text-mist">User: {x.uid}</div>
                </div>
                <div className="rounded-xl bg-panel2 px-3 py-2 text-right text-sm font-black">{x.diamonds?.toLocaleString()} 💎<div className="text-xs text-mist">{money(x.rupees)}</div></div>
              </div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><b>Method:</b> {x.method}</div>
                <div><b>Name:</b> {x.accountName}</div>
                <div><b>Account:</b> {x.account}</div>
                <div><b>Status:</b> <span className="font-bold">{x.status}</span></div>
              </div>

              {x.status === "pending" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={busy===x.id} onClick={() => call("approveWithdrawal", { requestId: x.id })} className="rounded-xl bg-ink px-4 py-3 text-xs font-black text-void disabled:opacity-50">APPROVE FOR PAYMENT</button>
                  <button disabled={busy===x.id} onClick={() => call("rejectWithdrawal", { requestId: x.id })} className="rounded-xl bg-red-500/10 px-4 py-3 text-xs font-black text-red-200 disabled:opacity-50">REJECT + RETURN DIAMONDS</button>
                </div>
              )}

              {x.status === "approved" && (
                <div className="mt-4 rounded-2xl bg-panel2 p-4">
                  <div className="text-xs text-mist">1. Send {money(x.rupees)} manually to the {x.method} account above.</div>
                  <div className="mt-3 flex gap-2">
                    <input value={refs[x.id] || ""} onChange={(e) => setRefs((r) => ({...r, [x.id]: e.target.value}))} placeholder="Manual transaction ID / reference" className="min-w-0 flex-1 rounded-xl bg-void p-3 text-sm ring-1 ring-white/10" />
                    <button disabled={busy===x.id || !refs[x.id]?.trim()} onClick={() => call("markWithdrawalPaid", { requestId: x.id, paymentReference: refs[x.id].trim() })} className="rounded-xl bg-ink px-4 py-3 text-xs font-black text-void disabled:opacity-50">MARK PAID</button>
                  </div>
                </div>
              )}

              {x.status === "paid" && <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-xs">Paid manually. Transaction reference: <b>{x.paymentReference}</b></div>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
