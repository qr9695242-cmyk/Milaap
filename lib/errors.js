// Firebase/Firestore errors carry a `.code` (e.g. "permission-denied",
// "failed-precondition") and a `.message` that's sometimes just the raw
// code itself (most notably "internal" — what onSnapshot/httpsCallable
// hand back for an unexpected server-side failure, with zero extra
// detail). Showing that literal string to a user looks like a bug. This
// maps known codes to a short Hinglish message; anything unrecognized
// falls back to the caller-supplied default instead of the raw string.
const FRIENDLY_MESSAGES = {
 "permission-denied": "Aapko is action ki permission nahi hai.",
 unauthenticated: "Pehle login karein.",
 "already-exists": "Yeh pehle se maujood hai.",
 "resource-exhausted": "Thoda ruk kar dobara try karein.",
 cancelled: "Cancel ho gaya.",
 "deadline-exceeded": "Request time out ho gayi, dobara try karein.",
 unavailable: "Firebase service unavailable hai. Internet ya Firebase deployment check karein.",
 "not-found": "Firebase Ludo service nahi mili. Cloud Functions deploy/enable hain ya nahi check karein.",
 internal: "Kuch masla ho gaya. Dobara try karein.",
 unknown: "Kuch masla ho gaya. Dobara try karein.",
 "failed-precondition": null, // these usually carry a genuinely useful message (e.g. missing index link) — let it through
};

export function friendlyFirebaseError(err, fallback = "Kuch masla ho gaya. Dobara try karein.") {
 const code = err?.code?.replace(/^functions\/|^firestore\//, "");
 const mapped = code && FRIENDLY_MESSAGES[code];
 if (mapped) return mapped;

 const raw = err?.message;
 // A message that's just the bare code (or empty) isn't useful to a user —
 // e.g. message === "internal" — so treat it the same as "no message".
 const isBareCode = !raw || raw.toLowerCase() === code;
 return isBareCode ? fallback : raw;
}
