"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { isInAppBrowser } from "@/lib/inAppBrowser";
import PremiumCard from "@/components/PremiumCard";
import { SUPPORT_CONFIG } from "@/lib/config";

export default function SignupPage() {
 return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-void"><p className="text-mist text-sm">Loading…</p></main>}><SignupContent /></Suspense>;
}

function normalizePhone(value) {
 const digits = String(value || "").replace(/\D/g, "");
 if (digits.startsWith("00")) return digits.slice(2);
 if (digits.startsWith("0")) return `92${digits.slice(1)}`;
 return digits;
}
function authEmailForPhone(phone) { return `${normalizePhone(phone)}@phone.milaap.local`; }
function makeWhatsAppCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

function SignupContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const refCode = searchParams.get("ref") || null;
 const { user } = useAuth();
 const [name, setName] = useState("");
 const [phone, setPhone] = useState("");
 const [password, setPassword] = useState("");
 const [waCode, setWaCode] = useState("");
 const [waOpened, setWaOpened] = useState(false);
 const [error, setError] = useState("");
 const [busy, setBusy] = useState(false);
 const [googleBusy, setGoogleBusy] = useState(false);
 const [inAppWarning, setInAppWarning] = useState(false);

 useEffect(() => setInAppWarning(isInAppBrowser()), []);
 useEffect(() => { if (user) router.replace("/"); }, [user, router]);
 useEffect(() => {
  let cancelled = false;
  (async () => {
   try {
    const result = await getRedirectResult(auth);
    if (!result || cancelled) return;
    await ensureUserDoc(result.user, refCode);
    router.replace("/");
   } catch (err) {
    if (!cancelled) setError(friendlyError(err.code));
   } finally { if (!cancelled) setGoogleBusy(false); }
  })();
  return () => { cancelled = true; };
 }, [router, refCode]);

 function prepareWhatsApp() {
  setError("");
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) { setError("Enter a valid mobile number, e.g. 03001234567."); return; }
  const code = waCode || makeWhatsAppCode();
  setWaCode(code);
  const target = String(SUPPORT_CONFIG.supportWhatsapp || "").replace(/\D/g, "");
  if (!target) { setError("WhatsApp verification number is not configured."); return; }
  const text = `Milaap account verification\nName: ${name || "New User"}\nMy mobile: +${normalized}\nVerification code: ${code}\nI am requesting WhatsApp verification for my Milaap account.`;
  const url = `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  setWaOpened(true);
 }

 async function handleGoogle() {
  setError("");
  if (isInAppBrowser()) { setError("Google sign-in may not work inside this in-app browser. Open in Chrome/Safari."); return; }
  setGoogleBusy(true);
  try {
   const result = await signInWithPopup(auth, googleProvider);
   await ensureUserDoc(result.user, refCode);
   router.replace("/");
  } catch (err) {
   if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(err.code)) {
    try { await signInWithRedirect(auth, googleProvider); return; } catch (redirectErr) { setError(friendlyError(redirectErr.code)); }
   } else if (err.code !== "auth/popup-closed-by-user") setError(friendlyError(err.code));
   setGoogleBusy(false);
  }
 }

 async function handleSignup(e) {
  e.preventDefault();
  setError("");
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) { setError("Enter a valid mobile number."); return; }
  if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
  if (!waOpened || !waCode) { setError("First tap 'Verify with WhatsApp' and send the message on WhatsApp."); return; }
  setBusy(true);
  try {
   const cred = await createUserWithEmailAndPassword(auth, authEmailForPhone(normalized), password);
   await updateProfile(cred.user, { displayName: name || `User ${normalized.slice(-4)}` });
   await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    displayName: name || `User ${normalized.slice(-4)}`,
    email: "",
    phone: `+${normalized}`,
    phoneAuthEmail: authEmailForPhone(normalized),
    whatsappVerificationCode: waCode,
    whatsappVerificationStatus: "user_sent_request",
    whatsappVerificationNote: "WhatsApp confirmation was initiated by the user. This flow does not automatically verify message delivery.",
    avatar: "", coins: 0, diamonds: 0, vipLevel: 0, totalRechargedRs: 0,
    familyId: null, referredByCode: refCode, createdAt: serverTimestamp(),
   });
   await setDoc(doc(db, "whatsappVerificationRequests", cred.user.uid), {
    uid: cred.user.uid, phone: `+${normalized}`, displayName: name || `User ${normalized.slice(-4)}`,
    code: waCode, status: "user_sent_request", createdAt: serverTimestamp(),
   });
   router.replace("/");
  } catch (err) { setError(friendlyError(err.code)); }
  finally { setBusy(false); }
 }

 return (
  <main className="flex min-h-screen flex-col justify-center bg-void px-6 py-8">
   <div className="mx-auto w-full max-w-sm">
    <h1 className="font-display text-3xl font-extrabold"><span className="glow-text">Create Account</span></h1>
    <p className="mt-2 text-sm text-mist">Mobile number se account banayein — SMS/SIM OTP nahi.</p>
    <PremiumCard glow className="mt-6 p-5">
     <button onClick={handleGoogle} disabled={googleBusy} className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-void disabled:opacity-60"><GoogleIcon />{googleBusy ? "Signing in…" : "Continue with Google"}</button>
     {inAppWarning && <p className="mt-2 text-center text-[11px] text-gold">⚠️ In-app browser detected. Chrome/Safari is recommended.</p>}
     <div className="mt-5 flex items-center gap-3"><div className="h-px flex-1 bg-white/10"/><span className="text-xs text-mist">or mobile</span><div className="h-px flex-1 bg-white/10"/></div>
     <form onSubmit={handleSignup} className="mt-5 space-y-4">
      <div><label className="text-xs text-mist">Display name</label><input type="text" required value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl bg-panel2 px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet" placeholder="Your name"/></div>
      <div><label className="text-xs text-mist">Mobile number</label><input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-xl bg-panel2 px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet" placeholder="0300 1234567"/></div>
      <div>
       <label className="text-xs text-mist">WhatsApp confirmation</label>
       <button type="button" onClick={prepareWhatsApp} className="mt-1 w-full rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white">{waOpened ? "WhatsApp Message Sent / Opened" : "Verify with WhatsApp"}</button>
       {waCode && <p className="mt-2 text-[11px] leading-5 text-mist">Code <b className="text-ink">{waCode}</b> ko WhatsApp par bhej kar wapas yahan aayein. Ye manual WhatsApp confirmation hai; website WhatsApp message ko automatically read nahi karti.</p>}
      </div>
      <div><label className="text-xs text-mist">Password</label><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl bg-panel2 px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet" placeholder="At least 6 characters"/></div>
      {error && <p className="text-xs text-neon-pink">{error}</p>}
      <button type="submit" disabled={busy} className="premium-btn w-full !rounded-full disabled:opacity-60">{busy ? "Creating…" : "Create Account"}</button>
     </form>
    </PremiumCard>
    <p className="mt-6 text-center text-sm text-mist">Already have an account? <Link href="/login" className="text-ink underline">Sign in</Link></p>
   </div>
  </main>
 );
}

function GoogleIcon() { return <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>; }

async function ensureUserDoc(firebaseUser, refCode = null) {
 const userRef = doc(db, "users", firebaseUser.uid); const snap = await getDoc(userRef);
 if (!snap.exists()) await setDoc(userRef, { uid: firebaseUser.uid, displayName: firebaseUser.displayName || "User", email: firebaseUser.email || "", avatar: firebaseUser.photoURL || "", coins: 0, diamonds: 0, vipLevel: 0, totalRechargedRs: 0, familyId: null, referredByCode: refCode, createdAt: serverTimestamp() });
}
function friendlyError(code) {
 const map = { "auth/email-already-in-use": "This mobile number already has an account.", "auth/weak-password": "Password is too weak.", "auth/invalid-email": "Invalid mobile account format.", "auth/popup-closed-by-user": "Google sign-in cancelled.", "auth/unauthorized-domain": "This site isn't authorized for Google sign-in yet." };
 return map[code] || "Something went wrong. Please try again.";
}
