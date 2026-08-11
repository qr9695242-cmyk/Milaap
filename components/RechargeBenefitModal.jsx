"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FIRST_RECHARGE_OFFER } from "@/lib/config";

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const target =
      typeof expiresAt.toMillis === "function" ? expiresAt.toMillis() : new Date(expiresAt).getTime();

    function tick() {
      setRemaining(Math.max(0, target - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");

  return { remaining, display: { days, hours: pad(hours), mins: pad(mins), secs: pad(secs) } };
}

/**
 * "Recharge Benefit" welcome popup — shows on the Wallet screen for a user
 * who hasn't claimed FIRST_RECHARGE_OFFER yet and whose 24hr window hasn't
 * expired. Closing it (X) just hides it for this visit; it reappears next
 * time the Wallet is opened until the user claims it or the timer runs out.
 */
export default function RechargeBenefitModal({ expiresAt, onClose }) {
  const router = useRouter();
  const { remaining, display } = useCountdown(expiresAt);

  useEffect(() => {
    if (remaining <= 0) return;
  }, [remaining]);

  if (!expiresAt || remaining <= 0) return null;

  function handlePurchase() {
    router.push("/wallet/recharge?offer=first");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#f3cf8a] to-[#e0ab5c] pb-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-lg text-[#7a4a1a]"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex flex-col items-center pt-8">
          <span className="text-5xl">🎁</span>
          <h2 className="mt-2 font-display text-2xl font-black text-[#7a2b1a]">Recharge Benefit</h2>
        </div>

        <div className="mx-6 mt-5 flex items-center justify-center gap-1.5 text-center">
          <span className="mr-1 text-sm font-semibold text-[#7a4a1a]">Countdown :</span>
          {[display.days, display.hours, display.mins, display.secs].map((v, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="rounded-lg bg-[#a5661f] px-2.5 py-1.5 font-display text-sm font-extrabold text-white">
                {v}
              </span>
              {i < 3 && <span className="text-[#7a4a1a]">:</span>}
            </span>
          ))}
        </div>

        <div className="mx-6 mt-5 flex items-center gap-3 rounded-2xl bg-[#7a2b1a] px-4 py-3">
          <span className="text-2xl">🐺</span>
          <p className="font-display text-base font-extrabold text-[#ffd27a]">
            SVIP1 × {FIRST_RECHARGE_OFFER.tiles.length + 1} Days Style Bonus
          </p>
        </div>

        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          {FIRST_RECHARGE_OFFER.tiles.map((tile) => (
            <div key={tile.label} className="relative rounded-xl bg-[#fbe9c4] p-3 pt-6 text-center shadow-inner">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#e35b3a] px-2.5 py-0.5 text-[10px] font-bold text-white">
                {tile.tag}
              </span>
              <p className="mt-2 text-xs font-semibold text-[#7a4a1a]">{tile.label}</p>
              <p className="mt-1 flex items-center justify-center gap-1 font-display text-sm font-extrabold text-[#a5661f]">
                🪙 {tile.coins.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-6 mt-4 rounded-xl bg-[#fbe9c4] p-3 text-center">
          <p className="text-[11px] font-semibold text-[#7a4a1a]">Total Coins</p>
          <p className="mt-0.5 font-display text-xl font-black text-[#a5661f]">
            🪙 {FIRST_RECHARGE_OFFER.coins.toLocaleString()}
          </p>
        </div>

        <button
          onClick={handlePurchase}
          className="mx-6 mt-5 block w-[calc(100%-3rem)] rounded-full bg-gradient-to-b from-[#ffe58a] to-[#f7b733] py-3.5 text-center font-display text-base font-black text-[#7a2b1a] shadow-lg active:scale-[0.98]"
        >
          Rs {FIRST_RECHARGE_OFFER.priceRs.toLocaleString()} Purchase
        </button>
      </div>
    </div>
  );
}
