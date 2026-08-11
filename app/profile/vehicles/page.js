"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { VEHICLE_CATALOG, RARITY_STYLE, purchaseDecoration, equipDecoration } from "@/lib/decorations";
import BottomNav from "@/components/BottomNav";

export default function VehiclesShopPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const owned = profile?.ownedVehicles || [];
  const equipped = profile?.equippedVehicle || null;
  const coins = profile?.coins ?? 0;

  async function handleAction(item) {
    setError(null);
    setMessage(null);
    setBusyId(item.id);
    try {
      const isOwned = item.free || owned.includes(item.id);
      if (!isOwned) {
        await purchaseDecoration(user.uid, "vehicle", item.id);
        setMessage(`${item.name} purchased & equipped!`);
      } else {
        setMessage(`${item.name} equipped!`);
      }
      await equipDecoration(user.uid, "vehicle", item.id);
    } catch (e) {
      setError(e.message);
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
            <h1 className="font-display text-lg font-extrabold text-ink">Vehicles / Cars</h1>
            <p className="text-xs text-ink/80">Ride in style when you enter a room</p>
          </div>
        </div>
      </section>

      <div className="mx-5 mt-4 flex items-center justify-between rounded-xl bg-panel px-4 py-3 ring-1 ring-white/5">
        <span className="text-sm text-mist">Your Coins</span>
        <span className="font-display text-base font-extrabold text-diamond">● {coins}</span>
      </div>

      {(error || message) && (
        <p className={`mx-5 mt-3 text-sm ${error ? "text-neon-pink" : "text-diamond"}`}>
          {error || message}
        </p>
      )}

      <section className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {VEHICLE_CATALOG.map((item) => {
          const isOwned = item.free || owned.includes(item.id);
          const isEquipped = item.free ? !equipped : equipped === item.id;
          const style = RARITY_STYLE[item.rarity];
          return (
            <div
              key={item.id}
              className={`flex flex-col items-center rounded-xl bg-panel p-3 ring-1 ${style.ring} ${style.glow}`}
            >
              <div
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl text-3xl"
                style={{ background: item.free ? "rgba(255,255,255,0.05)" : item.gradient }}
              >
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" draggable={false} />
                ) : item.free ? (
                  "🚫"
                ) : (
                  item.emoji
                )}
              </div>
              <p className="mt-2 line-clamp-1 text-center text-[11px] font-semibold text-ink">{item.name}</p>
              <p className="text-[9px] uppercase tracking-wide text-mist">{style.label}</p>
              {!item.free && (
                <p className="mt-1 text-[10px] font-bold text-diamond">● {item.priceCoins}</p>
              )}
              <button
                onClick={() => handleAction(item)}
                disabled={busyId === item.id || isEquipped}
                className={`mt-2 w-full rounded-full px-2 py-1 text-[10px] font-bold ${
                  isEquipped
                    ? "bg-panel2 text-mist"
                    : isOwned
                    ? "bg-diamond/20 text-diamond"
                    : "bg-glow-gradient text-ink"
                } disabled:opacity-60`}
              >
                {busyId === item.id ? "…" : isEquipped ? "Equipped" : isOwned ? "Equip" : "Buy"}
              </button>
            </div>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
