"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { RECHARGE_PACKAGES, submitRechargeRequest } from "@/lib/wallet";
import { SUPPORT_CONFIG } from "@/lib/config";

export default function RechargePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState("JazzCash");
  const [reference, setReference] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function handleSubmit() {
    if (!selected) return;
    setBusy(true);
    try {
      await submitRechargeRequest({
        uid: user.uid,
        name: profile?.displayName || "User",
        pkg: selected,
        method,
        reference,
      });
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const payNumber = SUPPORT_CONFIG.paymentMethods.find((m) => m.name === method)?.number;
  const whatsappText = encodeURIComponent(
    `Salam, maine ${selected?.coins ?? ""} coins (Rs ${selected?.priceRs ?? ""}) ka recharge ${method} se bheja hai. Reference: ${reference || "N/A"}`
  );

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-4 font-display text-lg font-extrabold text-ink">
          Request Submitted
        </h1>
        <p className="mt-2 text-sm text-mist">
          Aapki request review ke liye bhej di gayi hai. Confirm hote hi
          coins aapke wallet mein add ho jayenge.
        </p>
        <a
          href={`https://wa.me/${SUPPORT_CONFIG.paymentWhatsapp.replace("+", "")}?text=${whatsappText}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-ink"
        >
          Confirm on WhatsApp (faster)
        </a>
        <button
          onClick={() => router.push("/wallet")}
          className="mt-4 text-sm text-mist underline"
        >
          Back to Wallet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void px-5 pb-16 pt-6">
      <Link href="/wallet" className="text-lg text-ink/80">←</Link>
      <h1 className="mt-2 font-display text-xl font-extrabold text-ink">
        Recharge Coins
      </h1>

      {/* Step 1: pick a package */}
      <section className="mt-5">
        <p className="text-xs font-semibold text-mist">1. Choose a package</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {RECHARGE_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelected(pkg)}
              className={`rounded-xl p-4 text-left ring-1 ${
                selected?.id === pkg.id
                  ? "bg-glow-gradient ring-white/40"
                  : "bg-panel ring-white/5"
              }`}
            >
              <p className="font-display text-lg font-extrabold text-ink">
                ● {pkg.coins}
              </p>
              <p className="text-xs text-ink/80">Rs {pkg.priceRs}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: pay */}
      {selected && (
        <section className="mt-6">
          <p className="text-xs font-semibold text-mist">2. Pay via</p>
          <div className="mt-3 flex gap-2">
            {SUPPORT_CONFIG.paymentMethods.map((m) => (
              <button
                key={m.name}
                onClick={() => setMethod(m.name)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  method === m.name
                    ? "bg-white text-void"
                    : "bg-panel text-ink ring-1 ring-white/10"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-panel p-4 ring-1 ring-white/5">
            <p className="text-xs text-mist">Send Rs {selected.priceRs} to</p>
            <p className="mt-1 font-display text-lg font-extrabold text-gold">
              {payNumber}
            </p>
            <p className="text-xs text-mist">
              Account name: {SUPPORT_CONFIG.paymentRecipientName}
            </p>
          </div>

          <div className="mt-4">
            <label className="text-xs text-mist">
              Transaction ID / Reference (optional, faster approval)
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TXN123456"
              className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="mt-5 w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
          >
            {busy ? "Submitting…" : "I've Paid — Submit for Approval"}
          </button>
          <p className="mt-2 text-center text-[11px] text-mist">
            Coins add hone mein thora waqt lag sakta hai jab tak admin
            payment verify na kar le.
          </p>
        </section>
      )}
    </main>
  );
}
