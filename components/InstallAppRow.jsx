"use client";

import { useEffect, useState } from "react";
import { isStandalone, isIOS, triggerInstall } from "@/lib/installPrompt";

/**
 * "Install App" row for menus (Profile / Settings). Reuses the same
 * shared install-prompt state as the InstallPrompt bottom banner, so
 * tapping this works even after the banner's been dismissed.
 * Renders nothing once the app is already installed (standalone mode).
 */
export default function InstallAppRow() {
 const [standalone, setStandalone] = useState(true); // default hidden until checked, avoids flash
 const [showIosHelp, setShowIosHelp] = useState(false);

 useEffect(() => {
 setStandalone(isStandalone());
 }, []);

 async function handleClick() {
 if (isIOS()) {
 setShowIosHelp(true);
 return;
 }
 const outcome = await triggerInstall();
 if (outcome === "unavailable") {
 setShowIosHelp(true); // fall back to manual instructions if no native prompt is available
 }
 }

 if (standalone) return null;

 return (
 <>
 <button
 onClick={handleClick}
 className="flex min-h-[70px] w-full items-center gap-4 border-b border-white/5 px-4 text-left active:bg-white/5"
 >
 <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel2 text-xl">📲</span>
 <span className="min-w-0 flex-1 text-sm font-semibold text-ink">Install App</span>
 <span className="text-mist">›</span>
 </button>

 {showIosHelp && (
 <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowIosHelp(false)}>
 <div className="w-full max-w-md rounded-t-2xl bg-panel p-5" onClick={(e) => e.stopPropagation()}>
 <h2 className="font-display text-sm font-bold text-ink">Install Milaap</h2>
 <p className="mt-2 text-xs text-mist">
 Share button (□↑) dabayein → <span className="font-semibold text-ink">"Add to Home Screen"</span> choose karein.
 </p>
 <button onClick={() => setShowIosHelp(false)} className="mt-4 w-full py-2 text-center text-xs text-mist">
 Close
 </button>
 </div>
 </div>
 )}
 </>
 );
}
