"use client";

import { createContext, useContext, useEffect, useState } from "react";

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

const InstallContext = createContext(null);

// Captures the browser's `beforeinstallprompt` event once, app-wide, so any
// component (the dismissible banner, the Profile menu row, etc.) can trigger
// the same install prompt later — the event only fires once per page load
// and can't be re-requested, so whoever grabs it first has to share it.
export function InstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    setInstalled(isStandalone());

    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Returns "accepted" | "dismissed" | "unavailable" (no captured prompt —
  // caller should fall back to manual instructions, e.g. iOS).
  async function promptInstall() {
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  }

  return (
    <InstallContext.Provider value={{ deferredPrompt, installed, promptInstall }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const ctx = useContext(InstallContext);
  if (!ctx) throw new Error("useInstall must be used within InstallProvider");
  return ctx;
}
