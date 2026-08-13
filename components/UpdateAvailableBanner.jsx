"use client";

import { useEffect, useState, useCallback } from "react";
import { BUILD_VERSION } from "@/lib/buildVersion.generated";

const CHECK_INTERVAL_MS = 60 * 1000; // poll every minute

/**
 * App-store-style "Update available" toast. Every deploy stamps a fresh
 * BUILD_VERSION into the JS bundle (see scripts/gen-version.js) and writes
 * the same value to /public/version.json. A tab left open compares its own
 * baked-in version against the live version.json every minute (and
 * whenever it becomes visible again) — if they differ, a new version has
 * been deployed, so we show a banner prompting a reload. No native app
 * store needed; this is the PWA equivalent.
 */
export default function UpdateAvailableBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== BUILD_VERSION) {
        setUpdateAvailable(true);
      }
    } catch {
      // offline or request failed — silently skip, we'll try again next tick
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") checkForUpdate();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForUpdate]);

  async function handleUpdate() {
    setReloading(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
    } catch {
      // ignore — reload below fetches fresh assets regardless
    }
    window.location.reload();
  }

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-3 ring-1 ring-white/10 shadow-3d">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink">Naya version available 🎉</p>
        <p className="text-[11px] text-mist">Latest features ke liye update karo</p>
      </div>
      <button
        onClick={handleUpdate}
        disabled={reloading}
        className="shrink-0 rounded-full bg-glow-gradient px-4 py-2 text-xs font-bold text-ink disabled:opacity-60"
      >
        {reloading ? "Updating…" : "Update"}
      </button>
    </div>
  );
}
