"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { SUPPORT_CONFIG } from "@/lib/config";
import { useLanguage } from "@/lib/LanguageContext";
import BottomNav from "@/components/BottomNav";

export default function HelpPage() {
 const { user, loading } = useAuth();
 const router = useRouter();
 const { t } = useLanguage();

 useEffect(() => {
 if (!loading && !user) router.replace("/login");
 }, [loading, user, router]);

 if (loading || !user) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-void">
 <p className="text-mist text-sm">{t("common_loading")}</p>
 </main>
 );
 }

 return (
 <main className="min-h-screen bg-void px-5 pb-28 pt-6">
 <Link href="/profile" className="text-lg text-ink/80">←</Link>
 <h1 className="mt-2 font-display text-xl font-extrabold text-ink">{t("help_title")}</h1>
 <p className="mt-1 text-sm text-mist">{t("help_subtitle")}</p>

 <div className="mt-6 space-y-3">
 <a
 href={`https://wa.me/${SUPPORT_CONFIG.supportWhatsapp.replace("+", "")}`}
 target="_blank"
 rel="noreferrer"
 className="flex items-center justify-between premium-card p-4"
 >
 <div>
 <p className="text-sm font-semibold text-ink">{t("help_whatsapp")}</p>
 <p className="text-xs text-mist">{SUPPORT_CONFIG.supportWhatsapp}</p>
 </div>
 <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
 {t("help_chat")}
 </span>
 </a>

 <a
 href={`mailto:${SUPPORT_CONFIG.supportEmail}`}
 className="flex items-center justify-between premium-card p-4"
 >
 <div>
 <p className="text-sm font-semibold text-ink">{t("help_email")}</p>
 <p className="text-xs text-mist">{SUPPORT_CONFIG.supportEmail}</p>
 </div>
 <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-semibold text-ink">
 {t("help_email")}
 </span>
 </a>
 </div>

 <h2 className="mt-8 font-display text-sm font-bold text-ink">{t("help_safety_title")}</h2>
 <p className="mt-1 text-xs text-mist">{t("help_safety_subtitle")}</p>
 <div className="mt-3 space-y-3">
 {SUPPORT_CONFIG.supportAddress && (
 <div className="premium-card p-4">
 <p className="text-sm font-semibold text-ink">{t("help_address")}</p>
 <p className="mt-1 text-xs text-mist">{SUPPORT_CONFIG.supportAddress}</p>
 </div>
 )}
 <div className="premium-card p-4">
 <p className="text-sm font-semibold text-ink">{t("help_emergency_title")}</p>
 <p className="mt-1 text-xs text-mist">{t("help_emergency_body")}</p>
 </div>
 </div>

 <BottomNav />
 </main>
 );
}
