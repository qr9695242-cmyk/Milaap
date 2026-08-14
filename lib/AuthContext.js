"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { startPresenceHeartbeat } from "./presence";
import { registerForPushNotifications } from "./push";
import { FIRST_RECHARGE_OFFER } from "./config";
import { pruneExpiredDecorations } from "./decorations";

const AuthContext = createContext({ user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
 const [user, setUser] = useState(null);
 const [profile, setProfile] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let unsubProfile = null;
 let stopHeartbeat = null;

 // Safety net: agar kisi bhi wajah se (slow network, misconfigured
 // Firebase, waghera) auth state 8 second mein resolve na ho, loading
 // ko force false kar do taake app hamesha "Loading…" pe atki na rahe.
 const safetyTimer = setTimeout(() => setLoading(false), 8000);

 const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
 clearTimeout(safetyTimer);
 setUser(firebaseUser);
 if (unsubProfile) {
 unsubProfile();
 unsubProfile = null;
 }
 if (stopHeartbeat) {
 stopHeartbeat();
 stopHeartbeat = null;
 }

 if (firebaseUser) {
 try {
 const ref = doc(db, "users", firebaseUser.uid);
 const snap = await getDoc(ref);
 if (!snap.exists()) {
 // First login: create a starter profile document
 const name = firebaseUser.displayName || "New User";
 const starter = {
 uid: firebaseUser.uid,
 displayName: name,
 displayNameLower: name.toLowerCase(), // used by lib/search.js
 email: firebaseUser.email || "",
 avatar: firebaseUser.photoURL || "",
 coins: 0,
 diamonds: 0,
 vipLevel: 0,
 totalRechargedRs: 0,
 familyId: null,
 followersCount: 0,
 followingCount: 0,
 createdAt: serverTimestamp(),
 // First Recharge Benefit popup (see lib/config.js FIRST_RECHARGE_OFFER)
 // — 24hr countdown starts from account creation, one-time claim.
 firstOfferClaimed: false,
 firstOfferExpiresAt: new Date(Date.now() + FIRST_RECHARGE_OFFER.durationMs),
 bio: "",
 gender: "",
 };
 await setDoc(ref, starter);
 } else {
 const existing = snap.data();
 const patch = {};
 if (!existing.displayNameLower && existing.displayName) {
 // Self-heal: accounts created before search existed won't be
 // findable yet — backfill the lowercase field once, silently.
 patch.displayNameLower = existing.displayName.toLowerCase();
 }
 if (existing.firstOfferExpiresAt === undefined) {
 // Self-heal: accounts created before this offer existed —
 // give them one 24hr window too, backfilled once.
 patch.firstOfferClaimed = false;
 patch.firstOfferExpiresAt = new Date(Date.now() + FIRST_RECHARGE_OFFER.durationMs);
 }
 if (Object.keys(patch).length > 0) {
 await setDoc(ref, patch, { merge: true });
 }
 }

 // Live subscription so coins/diamonds/VIP update instantly everywhere
 // (gifts, recharges all write to this same doc).
 unsubProfile = onSnapshot(
 ref,
 (liveSnap) => {
 const liveData = liveSnap.exists() ? liveSnap.data() : null;
 setProfile(liveData);
 setLoading(false);
 // Self-heal: drop any Daily Reward frame/vehicle whose "x1
 // Day" / "x3 Days" window has passed (see
 // lib/decorations.js pruneExpiredDecorations). Cheap no-op
 // when nothing's expired, so safe to call on every update.
 if (liveData?.tempDecorations) {
 pruneExpiredDecorations(firebaseUser.uid, liveData).catch(() => {});
 }
 },
 () => setLoading(false) // onSnapshot itself failed — don't hang forever
 );

 // Real-time online status heartbeat (see lib/presence.js)
 const heartbeatName = firebaseUser.displayName || snap.data()?.displayName || "New User";
 stopHeartbeat = startPresenceHeartbeat(firebaseUser.uid, heartbeatName);

 // Ask for notification permission + save this device's push
 // token (see lib/push.js). Silently no-ops if not configured
 // yet or the user declines the browser permission prompt.
 registerForPushNotifications(firebaseUser.uid).catch(() => {});
 } catch (err) {
 // Firestore read/write failed (offline, rules, etc.) — never
 // leave the app stuck on the loading screen because of this.
 console.error("AuthContext profile load failed:", err);
 setProfile(null);
 setLoading(false);
 }
 } else {
 setProfile(null);
 setLoading(false);
 }
 });

 return () => {
 clearTimeout(safetyTimer);
 unsubAuth();
 if (unsubProfile) unsubProfile();
 if (stopHeartbeat) stopHeartbeat();
 };
 }, []);

 return (
 <AuthContext.Provider value={{ user, profile, loading }}>
 {children}
 </AuthContext.Provider>
 );
}

export function useAuth() {
 return useContext(AuthContext);
}
