// Shared PWA install-prompt state. The browser only ever fires
// `beforeinstallprompt` ONCE and only if you called preventDefault() on
// it, so whichever piece of UI happens to mount first has to capture and
// hold onto it — otherwise a second UI (e.g. an "Install App" row in
// Settings) that wants to trigger install later has nothing to call.
// This module attaches the listener once at import time and any number
// of components (InstallPrompt banner, a Settings button, etc.) can read
// from it.

let deferredEvent = null;
let listeners = [];

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

if (typeof window !== "undefined") {
 window.addEventListener("beforeinstallprompt", (e) => {
 e.preventDefault();
 deferredEvent = e;
 listeners.forEach((cb) => cb(e));
 });
}

/** Subscribe to be notified once the browser's install prompt becomes available. Returns an unsubscribe fn. */
export function onInstallPromptReady(cb) {
 listeners.push(cb);
 return () => {
 listeners = listeners.filter((l) => l !== cb);
 };
}

/** Whether the native install prompt is currently available to fire. */
export function hasInstallPrompt() {
 return !!deferredEvent;
}

/**
 * Fires the native install prompt.
 * Returns "ios" if this is iOS (no native prompt exists — caller should
 * show manual "Add to Home Screen" instructions), "unavailable" if no
 * prompt has been captured yet (already installed, or browser hasn't
 * fired beforeinstallprompt), or the browser's outcome string
 * ("accepted" / "dismissed") otherwise.
 */
export async function triggerInstall() {
 if (isIOS()) return "ios";
 if (!deferredEvent) return "unavailable";
 deferredEvent.prompt();
 const choice = await deferredEvent.userChoice;
 deferredEvent = null;
 return choice.outcome;
}
