"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { SUPPORT_CONFIG } from "@/lib/config";
import BottomNav from "@/components/BottomNav";

export default function HelpPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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

  return (
    <main className="min-h-screen bg-void px-5 pb-28 pt-6">
      <Link href="/profile" className="text-lg text-ink/80">←</Link>
      <h1 className="mt-2 font-display text-xl font-extrabold text-ink">Help & Support</h1>
      <p className="mt-1 text-sm text-mist">
        Kisi bhi masle ke liye humein contact karein.
      </p>

      <div className="mt-6 space-y-3">
        <a
          href={`https://wa.me/${SUPPORT_CONFIG.supportWhatsapp.replace("+", "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl bg-panel p-4 ring-1 ring-white/5"
        >
          <div>
            <p className="text-sm font-semibold text-ink">WhatsApp Support</p>
            <p className="text-xs text-mist">{SUPPORT_CONFIG.supportWhatsapp}</p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            Chat
          </span>
        </a>

        <a
          href={`mailto:${SUPPORT_CONFIG.supportEmail}`}
          className="flex items-center justify-between rounded-xl bg-panel p-4 ring-1 ring-white/5"
        >
          <div>
            <p className="text-sm font-semibold text-ink">Email Support</p>
            <p className="text-xs text-mist">{SUPPORT_CONFIG.supportEmail}</p>
          </div>
          <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-semibold text-ink">
            Email
          </span>
        </a>
      </div>

      <BottomNav />
    </main>
  );
}
