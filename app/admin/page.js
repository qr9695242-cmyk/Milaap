"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { effectiveRole, hasAtLeastRole, setUserRole, ROLES } from "@/lib/roles";
import {
 listenPendingRecharges,
 approveRecharge,
 rejectRecharge,
} from "@/lib/wallet";
import { listenActiveRooms, endRoom } from "@/lib/rooms";
import { listenPendingReports, resolveReport } from "@/lib/moderation";
import { getReferralConfig, setReferralConfig, DEFAULT_REFERRAL_COINS, DEFAULT_REFERRAL_MONTHS } from "@/lib/referral";
import { getExchangeRate, setExchangeRate } from "@/lib/exchangeRate";
import { DIAMOND_TO_COIN_RATE } from "@/lib/config";
import {
 listenAllEventBanners,
 createEventBanner,
 setEventBannerActive,
 deleteEventBanner,
} from "@/lib/eventBanners";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { GIFT_CATALOG } from "@/lib/gifts";
import { collection, onSnapshot, query, where, doc, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminPage() {
 const { user, profile, loading } = useAuth();
 const router = useRouter();
 const [recharges, setRecharges] = useState([]);
 const [rooms, setRooms] = useState([]);
 const [reports, setReports] = useState([]);
 const [withdrawals, setWithdrawals] = useState([]);
 const [listenerErrors, setListenerErrors] = useState({});
 const [busyId, setBusyId] = useState(null);
 const [roleTargetUid, setRoleTargetUid] = useState("");
 const [roleToGrant, setRoleToGrant] = useState(ROLES.MODERATOR);
 const [roleMessage, setRoleMessage] = useState(null);

 const [referral, setReferral] = useState(null); // { enabled, coinsPerReferral, expiresAt }
 const [referralCoins, setReferralCoins] = useState(DEFAULT_REFERRAL_COINS);
 const [referralMonths, setReferralMonths] = useState(DEFAULT_REFERRAL_MONTHS);
 const [referralBusy, setReferralBusy] = useState(false);
 const [referralMessage, setReferralMessage] = useState(null);

 // Diamond → Coin exchange rate (lib/exchangeRate.js) — same 1-doc pattern
 // as the referral config above.
 const [exchangeRate, setExchangeRateValue] = useState(null); // current live rate
 const [rateInput, setRateInput] = useState(DIAMOND_TO_COIN_RATE);
 const [rateBusy, setRateBusy] = useState(false);
 const [rateMessage, setRateMessage] = useState(null);

 // Occasion banners (Eid, events, etc.) — lib/eventBanners.js.
 const [banners, setBanners] = useState([]);
 const [bannerTitle, setBannerTitle] = useState("");
 const [bannerImageFile, setBannerImageFile] = useState(null);
 const [bannerImagePreview, setBannerImagePreview] = useState("");
 const [bannerHref, setBannerHref] = useState("");
 const [bannerCoins, setBannerCoins] = useState("");
 const [bannerGiftId, setBannerGiftId] = useState("");
 const [bannerBusy, setBannerBusy] = useState(false);
 const [bannerMessage, setBannerMessage] = useState(null);

 const role = effectiveRole(user, profile);
 const isAdmin = hasAtLeastRole(role, ROLES.ADMIN);
 const isModerator = hasAtLeastRole(role, ROLES.MODERATOR);
 const isSuperAdmin = role === ROLES.SUPERADMIN;

 useEffect(() => {
 if (!loading && !isModerator) router.replace("/");
 }, [loading, isModerator, router]);

 useEffect(() => {
 if (!isAdmin) return;
 const setErr = (key) => (err) =>
 setListenerErrors((prev) => ({ ...prev, [key]: err?.message || String(err) }));
 const unsub1 = listenPendingRecharges(setRecharges, setErr("recharges"));
 const unsub2 = listenActiveRooms(setRooms, setErr("rooms"));
 const withdrawalQuery = query(collection(db, "withdrawalRequests"), where("status", "==", "pending"));
 const unsub3 = onSnapshot(withdrawalQuery, (snap) => {
   setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a,b) => String(b.createdAt?.seconds || "").localeCompare(String(a.createdAt?.seconds || ""))));
 }, setErr("withdrawals"));
 return () => {
 unsub1();
 unsub2();
 unsub3();
 };
 }, [isAdmin]);

 useEffect(() => {
 if (!isModerator) return;
 return listenPendingReports(setReports, (err) =>
 setListenerErrors((prev) => ({ ...prev, reports: err?.message || String(err) }))
 );
 }, [isModerator]);

 useEffect(() => {
 if (!isAdmin) return;
 getReferralConfig()
 .then((cfg) => {
 setReferral(cfg);
 setReferralCoins(cfg.coinsPerReferral || DEFAULT_REFERRAL_COINS);
 })
 .catch((err) => setReferralMessage(err.message));
 }, [isAdmin]);

 useEffect(() => {
 if (!isAdmin) return;
 getExchangeRate()
 .then((rate) => {
 setExchangeRateValue(rate);
 setRateInput(rate);
 })
 .catch((err) => setRateMessage(err.message));
 }, [isAdmin]);

 useEffect(() => {
 if (!isAdmin) return;
 const setErr = (err) => setListenerErrors((prev) => ({ ...prev, banners: err?.message || String(err) }));
 return listenAllEventBanners(setBanners, setErr);
 }, [isAdmin]);

 async function handleWithdrawalStatus(id, status) {
   setBusyId(id);
   try {
     const item = withdrawals.find((w) => w.id === id);
     if (!item) throw new Error("Withdrawal request not found.");
     await runTransaction(db, async (tx) => {
       const reqRef = doc(db, "withdrawalRequests", id);
       const reqSnap = await tx.get(reqRef);
       if (!reqSnap.exists() || reqSnap.data()?.status !== "pending") throw new Error("This request was already reviewed.");
       if (status === "rejected") {
         const userRef = doc(db, "users", item.uid);
         const userSnap = await tx.get(userRef);
         if (!userSnap.exists()) throw new Error("User profile not found.");
         const currentDiamonds = Math.floor(Number(userSnap.data()?.diamonds || 0));
         tx.update(userRef, { diamonds: currentDiamonds + Math.floor(Number(item.diamonds || 0)) });
       }
       tx.update(reqRef, { status, reviewedAt: new Date().toISOString() });
     });
     setListenerErrors((prev) => ({ ...prev, withdrawals: "" }));
   } catch (e) {
     setListenerErrors((prev) => ({ ...prev, withdrawals: e?.message || String(e) }));
   } finally {
     setBusyId(null);
   }
 }

 async function handleReferralToggle(turnOn) {
 setReferralBusy(true);
 setReferralMessage(null);
 try {
 await setReferralConfig({
 turnOn,
 coinsPerReferral: Number(referralCoins) || DEFAULT_REFERRAL_COINS,
 months: Number(referralMonths) || DEFAULT_REFERRAL_MONTHS,
 });
 const fresh = await getReferralConfig();
 setReferral(fresh);
 setReferralMessage(turnOn ? "Referral offer activated." : "Referral offer paused.");
 } catch (err) {
 setReferralMessage(err.message);
 } finally {
 setReferralBusy(false);
 }
 }

 async function handleSaveRate() {
 setRateBusy(true);
 setRateMessage(null);
 try {
 const rate = await setExchangeRate(rateInput);
 setExchangeRateValue(rate);
 setRateMessage(`Rate updated: 1 diamond = ${rate} coins.`);
 } catch (err) {
 setRateMessage(err.message);
 } finally {
 setRateBusy(false);
 }
 }

 function handleBannerFile(e) {
 const file = e.target.files?.[0];
 if (!file) return;
 setBannerImageFile(file);
 setBannerImagePreview(URL.createObjectURL(file));
 }

 async function handleCreateBanner(e) {
 e.preventDefault();
 setBannerMessage(null);
 if (!bannerImageFile) {
 setBannerMessage("Pehle ek picture chunein.");
 return;
 }
 setBannerBusy(true);
 try {
 const { url } = await uploadToCloudinary(bannerImageFile, "eventBanners");
 const gift = GIFT_CATALOG.find((g) => g.id === bannerGiftId);
 await createEventBanner({
 title: bannerTitle,
 imageUrl: url,
 href: bannerHref,
 coins: bannerCoins,
 giftId: bannerGiftId,
 giftIcon: gift?.icon || "",
 });
 setBannerMessage("Banner add ho gaya.");
 setBannerTitle("");
 setBannerImageFile(null);
 setBannerImagePreview("");
 setBannerHref("");
 setBannerCoins("");
 setBannerGiftId("");
 } catch (err) {
 setBannerMessage(err.message);
 } finally {
 setBannerBusy(false);
 }
 }

 async function handleToggleBanner(id, active) {
 setBusyId(id);
 try {
 await setEventBannerActive(id, active);
 } finally {
 setBusyId(null);
 }
 }

 async function handleDeleteBanner(id) {
 setBusyId(id);
 try {
 await deleteEventBanner(id);
 } finally {
 setBusyId(null);
 }
 }

 async function handleGrantRole(e) {
 e.preventDefault();
 setRoleMessage(null);
 try {
 await setUserRole(roleTargetUid.trim(), roleToGrant);
 setRoleMessage(`Role updated to "${roleToGrant}" for that user.`);
 setRoleTargetUid("");
 } catch (err) {
 setRoleMessage(err.message);
 }
 }

 async function handleResolveReport(reportId, status) {
 setBusyId(reportId);
 try {
 await resolveReport(reportId, status);
 } finally {
 setBusyId(null);
 }
 }

 async function handleApprove(req) {
 setBusyId(req.id);
 try {
 await approveRecharge(req);
 } finally {
 setBusyId(null);
 }
 }

 async function handleReject(req) {
 setBusyId(req.id);
 try {
 await rejectRecharge(req.id);
 } finally {
 setBusyId(null);
 }
 }


 if (loading || !isModerator) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-void">
 <p className="text-mist text-sm">Loading…</p>
 
<div className="mt-4"><a href="/admin/diamond-settings" className="inline-flex rounded-xl bg-black px-4 py-3 text-sm font-black text-white">💎 Diamond Settings</a></div>
</main>
 );
 }

 return (
 <main className="min-h-screen bg-void px-5 pb-16 pt-6">
 <div className="flex items-center justify-between">
 <div>
 <Link href="/profile" className="text-lg text-ink/80">←</Link>
 <h1 className="font-display text-xl font-extrabold text-ink">Admin Panel</h1>
 <p className="text-xs text-mist">
 Signed in as {user.email} · role: {role}
 </p>
 </div>
 {isAdmin && (
 <Link
 href="/admin/analytics"
 className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-diamond ring-1 ring-diamond/30"
 >
 Analytics
 </Link>
 )}
 </div>

 {isAdmin && (
 <section className="mt-6">
 <h2 className="font-display text-sm font-bold text-ink">
 Pending Recharges ({recharges.length})
 </h2>
 {listenerErrors.recharges && (
 <p className="mt-2 text-xs text-neon-pink">
 ⚠ Load nahi ho saka: {listenerErrors.recharges}. Agar "index" ka
 zikar ho to console (F12) mein Firestore ka link click karein.
 </p>
 )}
 {recharges.length === 0 ? (
 <p className="mt-3 text-xs text-mist">Nothing pending.</p>
 ) : (
 <div className="mt-3 space-y-2">
 {recharges.map((r) => (
 <div key={r.id} className="premium-card p-3">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-semibold text-ink">{r.name}</p>
 <p className="text-xs text-mist">
 ● {r.coins} coins · Rs {r.priceRs} · {r.method}
 </p>
 {r.reference ? (
 <p className="text-xs text-mist">Ref: {r.reference}</p>
 ) : (
 <p className="text-xs font-semibold text-neon-pink">
 ⚠ No Transaction ID — verify payment manually before approving
 </p>
 )}
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => handleApprove(r)}
 disabled={busyId === r.id || !r.reference}
 title={!r.reference ? "Cannot approve — Transaction ID missing" : ""}
 className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
 >
 Approve
 </button>
 <button
 onClick={() => handleReject(r)}
 disabled={busyId === r.id}
 className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30 disabled:opacity-60"
 >
 Reject
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </section>
 )}

 {isAdmin && (
 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">
 Live Rooms ({rooms.length})
 </h2>
 {listenerErrors.rooms && (
 <p className="mt-2 text-xs text-neon-pink">
 ⚠ Load nahi ho saka: {listenerErrors.rooms}
 </p>
 )}
 {rooms.length === 0 ? (
 <p className="mt-3 text-xs text-mist">Nothing live right now.</p>
 ) : (
 <div className="mt-3 space-y-2">
 {rooms.map((r) => (
 <div
 key={r.id}
 className="flex items-center justify-between premium-card p-3"
 >
 <div>
 <p className="text-sm font-semibold text-ink">{r.title}</p>
 <p className="text-xs text-mist">
 {r.type} · hosted by {r.hostName}
 </p>
 </div>
 <button
 onClick={() => endRoom(r.id)}
 className="rounded-full bg-neon-pink/20 px-3 py-1.5 text-xs font-semibold text-neon-pink"
 >
 Force End
 </button>
 </div>
 ))}
 </div>
 )}
 </section>
 )}

 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">
 Pending Reports ({reports.length})
 </h2>
 {listenerErrors.reports && (
 <p className="mt-2 text-xs text-neon-pink">
 ⚠ Load nahi ho saka: {listenerErrors.reports}
 </p>
 )}
 {reports.length === 0 ? (
 <p className="mt-3 text-xs text-mist">Nothing to review.</p>
 ) : (
 <div className="mt-3 space-y-2">
 {reports.map((r) => (
 <div key={r.id} className="premium-card p-3">
 <p className="text-sm font-semibold text-ink">
 Reported: {r.targetName || r.targetUid}
 </p>
 <p className="text-xs text-mist">
 By {r.reporterName || r.reporterUid} · {r.reason || "No reason given"}
 </p>
 {r.details && <p className="mt-1 text-xs text-mist">"{r.details}"</p>}
 <div className="mt-2 flex gap-2">
 <button
 onClick={() => handleResolveReport(r.id, "resolved")}
 disabled={busyId === r.id}
 className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
 >
 Mark Resolved
 </button>
 <button
 onClick={() => handleResolveReport(r.id, "dismissed")}
 disabled={busyId === r.id}
 className="premium-chip px-3 py-1.5 text-xs font-semibold text-mist disabled:opacity-60"
 >
 Dismiss
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </section>

 {isAdmin && (
 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">Referral Program</h2>
 <p className="mt-1 text-xs text-mist">
 Controls the "Invite Friends" reward shown on /invite. When ON, a
 referrer gets the coin amount below the moment their invited
 friend signs up — paid server-side by the awardReferralBonus
 Cloud Function, never trusted from the browser.
 </p>
 <div className="mt-3 premium-card space-y-3 p-3">
 <div className="flex items-center justify-between">
 <span className="text-xs text-mist">Status</span>
 <span
 className={`rounded-full px-3 py-1 text-xs font-bold ${
 referral?.enabled
 ? "bg-emerald-500/20 text-emerald-400"
 : "bg-panel2 text-mist"
 }`}
 >
 {referral === null ? "…" : referral.enabled ? "ON" : "OFF"}
 </span>
 </div>
 {referral?.expiresAt && (
 <p className="text-[11px] text-mist">
 {referral.enabled ? "Runs until " : "Last run ended "}
 {referral.expiresAt.toLocaleDateString(undefined, {
 day: "numeric",
 month: "short",
 year: "numeric",
 })}
 </p>
 )}
 <div className="flex gap-2">
 <label className="flex-1 text-xs text-mist">
 Coins per referral
 <input
 type="number"
 min="0"
 value={referralCoins}
 onChange={(e) => setReferralCoins(e.target.value)}
 className="mt-1 w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 </label>
 <label className="flex-1 text-xs text-mist">
 Run for (months)
 <input
 type="number"
 min="1"
 value={referralMonths}
 onChange={(e) => setReferralMonths(e.target.value)}
 className="mt-1 w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 </label>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => handleReferralToggle(true)}
 disabled={referralBusy}
 className="flex-1 rounded-full bg-glow-gradient py-2.5 text-sm font-bold text-ink disabled:opacity-60"
 >
 {referral?.enabled ? "Restart new run" : `Activate for ${referralMonths} months`}
 </button>
 <button
 onClick={() => handleReferralToggle(false)}
 disabled={referralBusy || !referral?.enabled}
 className="flex-1 rounded-full bg-panel2 py-2.5 text-sm font-bold text-neon-pink ring-1 ring-neon-pink/30 disabled:opacity-60"
 >
 Turn Off
 </button>
 </div>
 {referralMessage && <p className="text-xs text-mist">{referralMessage}</p>}
 </div>
 </section>
 )}

 {isAdmin && (
 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">Diamond Withdrawals</h2>
 <p className="mt-1 text-xs text-mist">Pending payout requests from users. Review the payment details before approving.</p>
 {listenerErrors.withdrawals && <p className="mt-2 text-xs text-neon-pink">Load error: {listenerErrors.withdrawals}</p>}
 <div className="mt-3 space-y-2">
 {withdrawals.length === 0 ? <p className="text-xs text-mist">No pending withdrawals.</p> : withdrawals.map((w) => (
   <div key={w.id} className="premium-card p-3">
     <div className="flex items-start justify-between gap-3">
       <div className="min-w-0">
         <p className="text-sm font-bold text-ink">💎 {Number(w.diamonds || 0).toLocaleString()} Diamonds</p>
         <p className="mt-1 text-xs text-mist">{w.method} · {w.name} · {w.account}</p>
         <p className="mt-1 text-[10px] text-mist">UID: {w.uid}</p>
       </div>
       <span className="rounded-full bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">PENDING</span>
     </div>
     <div className="mt-3 grid grid-cols-2 gap-2">
       <button disabled={busyId === w.id} onClick={() => handleWithdrawalStatus(w.id, "approved")} className="rounded-xl bg-emerald-400/15 py-2 text-xs font-bold text-emerald-300 ring-1 ring-emerald-300/20">Approve</button>
       <button disabled={busyId === w.id} onClick={() => handleWithdrawalStatus(w.id, "rejected")} className="rounded-xl bg-neon-pink/15 py-2 text-xs font-bold text-neon-pink ring-1 ring-neon-pink/20">Reject</button>
     </div>
   </div>
 ))}
 </div>
 </section>
 )}

 {isAdmin && (
 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">Exchange Rate</h2>
 <p className="mt-1 text-xs text-mist">
 Controls how many coins a user gets per diamond on the Wallet screen
 (Diamonds → Coins). Purely in-app, applies instantly to every user —
 no approval step, just like before, only now you set the number here
 instead of it being fixed in the code.
 </p>
 <div className="mt-3 premium-card space-y-3 p-3">
 <div className="flex items-center justify-between">
 <span className="text-xs text-mist">Current rate</span>
 <span className="rounded-full bg-panel px-3 py-1 text-xs font-bold text-diamond ring-1 ring-diamond/30">
 {exchangeRate === null ? "…" : `1 ◆ = ${exchangeRate} ●`}
 </span>
 </div>
 <label className="block text-xs text-mist">
 Coins per 1 diamond
 <input
 type="number"
 min="1"
 value={rateInput}
 onChange={(e) => setRateInput(e.target.value)}
 className="mt-1 w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 </label>
 <button
 onClick={handleSaveRate}
 disabled={rateBusy}
 className="w-full rounded-full bg-glow-gradient py-2.5 text-sm font-bold text-ink disabled:opacity-60"
 >
 {rateBusy ? "Saving…" : "Save Rate"}
 </button>
 {rateMessage && <p className="text-xs text-mist">{rateMessage}</p>}
 </div>
 </section>
 )}

 {isAdmin && (
 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">Occasion Banners</h2>
 <p className="mt-1 text-xs text-mist">
 Upload a picture for an occasion (Eid, an event, anything) — it shows
 up in the rotating banner strip above the room video stage. Optionally
 attach a coin reward (each user can claim it once) and a gift icon
 from the catalog.
 </p>

 <form onSubmit={handleCreateBanner} className="mt-3 space-y-2 premium-card p-3">
 <label className="block text-xs text-mist">
 Picture
 <input
 type="file"
 accept="image/*"
 onChange={handleBannerFile}
 className="mt-1 w-full text-xs text-mist file:mr-2 file:rounded-full file:border-0 file:bg-panel2 file:px-3 file:py-1.5 file:text-xs file:text-ink"
 />
 </label>
 {bannerImagePreview && (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={bannerImagePreview}
 alt="Preview"
 className="h-24 w-full rounded-lg object-cover"
 />
 )}
 <input
 value={bannerTitle}
 onChange={(e) => setBannerTitle(e.target.value)}
 placeholder="Title, e.g. Eid Mubarak! 🌙"
 className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 <input
 value={bannerHref}
 onChange={(e) => setBannerHref(e.target.value)}
 placeholder="Link when tapped (optional), e.g. /rewards"
 className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 <div className="flex gap-2">
 <input
 type="number"
 min="0"
 value={bannerCoins}
 onChange={(e) => setBannerCoins(e.target.value)}
 placeholder="Coin reward (optional)"
 className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 <select
 value={bannerGiftId}
 onChange={(e) => setBannerGiftId(e.target.value)}
 className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 >
 <option value="">No gift icon</option>
 {GIFT_CATALOG.map((g) => (
 <option key={g.id} value={g.id}>
 {g.icon} {g.name}
 </option>
 ))}
 </select>
 </div>
 <button
 disabled={bannerBusy}
 className="w-full rounded-full bg-glow-gradient py-2.5 text-sm font-bold text-ink disabled:opacity-60"
 >
 {bannerBusy ? "Uploading…" : "Add Banner"}
 </button>
 {bannerMessage && <p className="text-xs text-mist">{bannerMessage}</p>}
 </form>

 {listenerErrors.banners && (
 <p className="mt-2 text-xs text-neon-pink">⚠ Load nahi ho saka: {listenerErrors.banners}</p>
 )}
 {banners.length === 0 ? (
 <p className="mt-3 text-xs text-mist">Koi banner nahi bana abhi tak.</p>
 ) : (
 <div className="mt-3 space-y-2">
 {banners.map((b) => (
 <div key={b.id} className="flex items-center gap-3 premium-card p-3">
 {b.imageUrl && (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={b.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
 )}
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-ink">{b.title}</p>
 <p className="text-xs text-mist">
 {b.coins > 0 ? `● ${b.coins.toLocaleString()} · ` : ""}
 {b.active !== false ? "Active" : "Off"}
 </p>
 </div>
 <div className="flex shrink-0 gap-2">
 <button
 onClick={() => handleToggleBanner(b.id, b.active === false)}
 disabled={busyId === b.id}
 className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/10 disabled:opacity-60"
 >
 {b.active !== false ? "Turn Off" : "Turn On"}
 </button>
 <button
 onClick={() => handleDeleteBanner(b.id)}
 disabled={busyId === b.id}
 className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold text-neon-pink ring-1 ring-neon-pink/30 disabled:opacity-60"
 >
 Delete
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </section>
 )}

 {isSuperAdmin && (
 <section className="mt-8">
 <h2 className="font-display text-sm font-bold text-ink">Manage Team Roles</h2>
 <p className="mt-1 text-xs text-mist">
 Grant moderator or admin access to another user by their UID (find it on their
 profile page URL: /u/&lt;uid&gt;).
 </p>
 <form onSubmit={handleGrantRole} className="mt-3 space-y-2 premium-card p-3">
 <input
 value={roleTargetUid}
 onChange={(e) => setRoleTargetUid(e.target.value)}
 placeholder="Target user UID"
 className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 />
 <select
 value={roleToGrant}
 onChange={(e) => setRoleToGrant(e.target.value)}
 className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm text-ink outline-none ring-1 ring-white/10"
 >
 <option value={ROLES.MODERATOR}>Moderator</option>
 <option value={ROLES.ADMIN}>Admin</option>
 <option value={ROLES.USER}>Revoke (back to User)</option>
 </select>
 <button className="w-full rounded-full bg-glow-gradient py-2.5 text-sm font-bold text-ink">
 Update Role
 </button>
 {roleMessage && <p className="text-xs text-mist">{roleMessage}</p>}
 </form>
 </section>
 )}
 </main>
 );
}
