// Profile visitor tracking — powers the SVIP "Hide visitor records" toggle
// and the "View visitor records" honorary privilege (see app/vip/settings
// and app/profile/visitors). Stored as a subcollection so only the profile
// owner can ever read who visited them: users/{uid}/visitors/{visitorUid}.
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Records that `viewer` just visited `visitedUid`'s profile. No-ops for
 * self-visits and for viewers who've turned on "Hide visitor records".
 * Uses setDoc (not addDoc) keyed by the viewer's uid so repeat visits just
 * bump the timestamp instead of piling up duplicate entries.
 */
export async function recordVisit(visitedUid, viewer) {
 if (!visitedUid || !viewer?.uid || visitedUid === viewer.uid) return;
 if (viewer.hideVisitorRecords) return;
 const ref = doc(db, "users", visitedUid, "visitors", viewer.uid);
 await setDoc(ref, {
 uid: viewer.uid,
 name: viewer.name || "User",
 avatar: viewer.avatar || "",
 vipLevel: viewer.vipLevel || 0,
 visitedAt: serverTimestamp(),
 });
}

/** Owner-only: live list of who's visited my profile, most recent first. */
export function listenVisitors(uid, callback, max = 50) {
 const q = query(collection(db, "users", uid, "visitors"), orderBy("visitedAt", "desc"), limit(max));
 return onSnapshot(q, (snap) => {
 callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
 });
}
