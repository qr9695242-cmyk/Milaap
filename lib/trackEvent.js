// Thin wrapper around Firebase Analytics so the rest of the app never has
// to null-check `analytics` itself. `analytics` in lib/firebase.js starts
// out null and only becomes ready after the async isSupported() check
// resolves in the browser — this silently no-ops until then (and forever,
// in environments where Analytics isn't supported), instead of throwing.

import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";

/**
 * Log a custom Analytics event.
 * Example: trackEvent("gift_sent", { giftId, roomId, coins });
 */
export function trackEvent(eventName, params) {
 if (!analytics) return;
 try {
 logEvent(analytics, eventName, params);
 } catch {
 // Never let analytics failures affect the actual feature.
 }
}
