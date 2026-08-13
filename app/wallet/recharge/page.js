"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { RECHARGE_PACKAGES, submitRechargeRequest, claimFirstRechargeOffer } from "@/lib/wallet";
import { getExchangeRate } from "@/lib/exchangeRate";
import { SUPPORT_CONFIG, FIRST_RECHARGE_OFFER, DIAMOND_TO_COIN_RATE, GIFT_DIAMOND_RATE } from "@/lib/config";

// useSearchParams() opts the page into client-side rendering during
// prerender, and Next.js requires it to sit below a <Suspense> boundary —
// otherwise `npm run build` fails on this page with "useSearchParams()
// should be wrapped in a suspense boundary". So the actual page content
// (which reads the `offer` query param) lives in RechargeContent below,
// and the default export just wraps it in Suspense.
export default function RechargePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-void">
          <p className="text-mist text-sm">Loading…</p>
        </main>
      }
    >
      <RechargeContent />
    </Suspense>
  );
}

function RechargeContent() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstOffer = searchParams.get("offer") === "first";

  // Special one-time "Recharge Benefit" bundle only shows here if the link
  // came from the popup AND the user hasn't already claimed it.
  const showFirstOfferPack = isFirstOffer && profile && !profile.firstOfferClaimed;

  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState("JazzCash");
  const [reference, setReference] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  // Live, admin-set rate (see /admin → "Exchange Rate"). Starts at the code
  // default so there's no flash before Firestore responds.
  const [diamondRate, setDiamondRate] = useState(DIAMOND_TO_COIN_RATE);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    getExchangeRate().then(setDiamondRate).catch(() => {});
  }, []);

  useEffect(() => {
    if (showFirstOfferPack) {
      setSelected({
        id: FIRST_RECHARGE_OFFER.id,
        coins: FIRST_RECHARGE_OFFER.coins,
        priceRs: FIRST_RECHARGE_OFFER.priceRs,
        isFirstOffer: true,
      });
    }
  }, [showFirstOfferPack]);

  async function handleSubmit() {
    if (!selected) return;
    if (!reference.trim()) return; // Transaction ID zaroori hai — bina iske submit nahi hoga
    setBusy(true);
    try {
      if (selected.isFirstOffer) {
        await claimFirstRechargeOffer({
          uid: user.uid,
          name: profile?.displayName || "User",
          method,
          reference,
        });
      } else {
        await submitRechargeRequest({
          uid: user.uid,
          name: profile?.displayName || "User",
          pkg: selected,
          method,
          reference,
        });
      }
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
      <h1 className="mt-2 font-display text-2xl font-black text-ink">Recharge Coins</h1>
      <p className="mt-1 text-xs text-mist">5 premium coin packs • instant in-app balance after approval</p>

      <div className="mt-3 rounded-xl bg-panel px-4 py-3 text-[11px] text-mist ring-1 ring-white/5">
        <p>💎 Exchange rate: <span className="font-bold text-diamond">1 diamond = {diamondRate} coins</span></p>
        <p className="mt-0.5">🎁 Gift rate: <span className="font-bold text-diamond">{Math.round(1 / GIFT_DIAMOND_RATE)} coins spent = 1 diamond</span> earned by host</p>
      </div>

      {showFirstOfferPack && (
        <section className="mt-5">
          <p className="text-xs font-semibold text-mist">🎁 Your one-time Recharge Benefit</p>
          <button
            onClick={() =>
              setSelected({
                id: FIRST_RECHARGE_OFFER.id,
                coins: FIRST_RECHARGE_OFFER.coins,
                priceRs: FIRST_RECHARGE_OFFER.priceRs,
                isFirstOffer: true,
              })
            }
            className={`mt-3 w-full rounded-2xl p-4 text-left ${
              selected?.isFirstOffer
                ? "bg-glow-gradient ring-2 ring-white/50"
                : "premium-card bg-panel ring-1 ring-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-lg font-extrabold text-ink">
                ● {FIRST_RECHARGE_OFFER.coins.toLocaleString()}
              </p>
              <span className="premium-chip text-gold">WELCOME BONUS</span>
            </div>
            <p className="mt-2 text-xs font-bold text-ink/80">Rs {FIRST_RECHARGE_OFFER.priceRs.toLocaleString()}</p>
            <p className="mt-1 text-[9px] text-mist">One-time only • expires with countdown</p>
          </button>
        </section>
      )}

      {/* Step 1: pick a package */}
      <section className="mt-5">
        <p className="text-xs font-semibold text-mist">1. Choose a package</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {RECHARGE_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelected(pkg)}
              className={`premium-card p-4 text-left ${
                selected?.id === pkg.id
                  ? "bg-glow-gradient ring-white/40"
                  : "bg-panel ring-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg font-extrabold text-ink">● {pkg.coins.toLocaleString()}</p>
                <span className="premium-chip text-gold">COINS</span>
              </div>
              {pkg.bonusCoins > 0 && (
                <p className="mt-1 text-[11px] font-bold text-emerald-400">+{pkg.bonusCoins.toLocaleString()} bonus</p>
              )}
              <p className="mt-2 text-xs font-bold text-ink/80">Rs {pkg.priceRs.toLocaleString()}</p>
              <p className="mt-1 text-[9px] text-mist">Premium pack • {pkg.id.toUpperCase()}</p>
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

          <div className="mt-4 premium-card p-4">
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
              Transaction ID / Reference <span className="text-neon-pink">*required</span>
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TXN123456"
              required
              className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
            />
            {!reference.trim() && (
              <p className="mt-1 text-[10px] text-neon-pink">
                Transaction ID likhna zaroori hai, iske bagair request submit nahi hogi.
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || !reference.trim()}
            className="mt-5 w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
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
