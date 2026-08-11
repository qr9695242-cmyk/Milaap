"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { startPresenceHeartbeat } from "./presence";

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
            };
            await setDoc(ref, starter);
          } else if (!snap.data().displayNameLower && snap.data().displayName) {
            // Self-heal: accounts created before search existed won't be
            // findable yet — backfill the lowercase field once, silently.
            await setDoc(ref, { displayNameLower: snap.data().displayName.toLowerCase() }, { merge: true });
          }

          // Live subscription so coins/diamonds/VIP update instantly everywhere
          // (gifts, recharges all write to this same doc).
          unsubProfile = onSnapshot(
            ref,
            (liveSnap) => {
              setProfile(liveSnap.exists() ? liveSnap.data() : null);
              setLoading(false);
            },
            () => setLoading(false) // onSnapshot itself failed — don't hang forever
          );

          // Real-time online status heartbeat (see lib/presence.js)
          stopHeartbeat = startPresenceHeartbeat(firebaseUser.uid);
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
