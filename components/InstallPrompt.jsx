"use client";

import { useEffect, useState } from "react";
import { isStandalone, isIOS, onInstallPromptReady, hasInstallPrompt, triggerInstall } from "@/lib/installPrompt";

export default function InstallPrompt() {
 const [visible, setVisible] = useState(false);
 const [showIosHelp, setShowIosHelp] = useState(false);
 const [dismissed, setDismissed] = useState(false);

 useEffect(() => {
 if ("serviceWorker" in navigator) {
 navigator.serviceWorker.register("/sw.js").catch(() => {});
 }
 if (isStandalone()) return;
 if (localStorage.getItem("milaap_install_dismissed") === "1") return;

 if (hasInstallPrompt()) setVisible(true);
 const unsubscribe = onInstallPromptReady(() => setVisible(true));

 // iOS Safari has no beforeinstallprompt — show manual instructions instead
 if (isIOS()) setVisible(true);

 return unsubscribe;
 }, []);

 async function handleInstall() {
 if (isIOS()) {
 setShowIosHelp(true);
 return;
 }
 const outcome = await triggerInstall();
 if (outcome === "accepted" || outcome === "dismissed") setVisible(false);
 }

 function handleDismiss() {
 setDismissed(true);
 localStorage.setItem("milaap_install_dismissed", "1");
 }

 if (!visible || dismissed) return null;

 return (
 <div className="fixed inset-x-4 bottom-20 z-50 flex items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-3 shadow-glow ring-1 ring-white/10">
 {showIosHelp ? (
 <p className="text-xs text-ink">
 Share button (□↑) dabayein → <span className="font-semibold">"Add to Home Screen"</span> choose karein.
 </p>
 ) : (
 <>
 <p className="text-xs text-ink">📲 Milaap ko app ki tarah install karein</p>
 <div className="flex shrink-0 gap-2">
 <button
 onClick={handleInstall}
 className="rounded-full bg-glow-gradient px-3 py-1.5 text-xs font-semibold text-ink"
 >
 Install
 </button>
 <button
 onClick={handleDismiss}
 className="rounded-full bg-panel2 px-3 py-1.5 text-xs text-mist ring-1 ring-white/10"
 >
 ✕
 </button>
 </div>
 </>
 )}
 </div>
 );
}
