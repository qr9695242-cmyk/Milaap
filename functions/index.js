// Firebase Cloud Functions — deploy with: firebase deploy --only functions
// (needs the Blaze/pay-as-you-go plan — Cloud Functions v2 requires it).
// Push notifications and real emails can't be sent reliably from
// client-side code, so these run on Firestore writes instead.
//
// Schema this file assumes (kept in sync with the actual app code):
// - users/{uid}: "fcmTokens" array (lib/push.js), "email" + "role" for
// admin lookup (matches ADMIN_EMAILS in lib/config.js / firestore.rules).
// - notifications/{uid}/items/{itemId}: created by lib/notifications.js
// for every in-app notification (follow, gift, system, recharge, the
// "user came online" broadcast, etc). This function turns EVERY one
// of those into a real push notification too — that's what makes an
// app message actually show up outside the app, not just in the bell.
// - rechargeRequests/{id}: created by lib/wallet.js submitRechargeRequest,
// { uid, name, coins, priceRs, status: "pending" }.
// - rooms/{roomId}: "status" ("live" when broadcasting) + "hostName".
//
// Email setup (separate from push): this file writes a doc into the
// "mail" collection in the exact shape the official Firebase Extension
// "Trigger Email from Firestore" expects. Install that extension from the
// Firebase console → Extensions, and configure it with your own Gmail
// (App Password) or other SMTP provider — an email can't actually be
// delivered without you providing real SMTP/sender credentials somewhere;
// no code can do that for you. Docs: https://extensions.dev/extensions/firebase/firestore-send-email

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// Keep in sync with ADMIN_EMAILS in lib/config.js and isSuperAdmin() in firestore.rules.
const ADMIN_EMAILS = ["abdulhadi7888888@gmail.com"];

async function sendToTokens(tokens, notification, data = {}) {
 const clean = [...new Set(tokens.filter(Boolean))];
 if (!clean.length) return;
 await messaging.sendEachForMulticast({ tokens: clean, notification, data });
}

async function getAdminTokensAndEmails() {
 const usersSnap = await db.collection("users").get();
 const tokens = [];
 const emails = [];
 usersSnap.docs.forEach((d) => {
 const data = d.data();
 const isAdmin = data.role === "admin" || ADMIN_EMAILS.includes(data.email);
 if (!isAdmin) return;
 tokens.push(...(data.fcmTokens || []));
 if (data.email) emails.push(data.email);
 });
 return { tokens, emails };
}

// --- 1. Any in-app notification → also send it as a real push ---------
// This is what makes every message that lands in someone's bell (gift,
// follow, "user came online" broadcast, admin alerts, etc.) also show up
// as an actual system/lock-screen notification on their device.
exports.pushOnNewNotification = onDocumentCreated("notifications/{uid}/items/{itemId}", async (event) => {
 const { uid } = event.params;
 const notif = event.data.data();

 const userSnap = await db.collection("users").doc(uid).get();
 const tokens = userSnap.exists ? userSnap.data().fcmTokens || [] : [];

 await sendToTokens(
 tokens,
 { title: notif.title || "Milaap", body: notif.body || "" },
 { url: notif.link || "/notifications" }
 );
});

// --- 2. Room goes live: notify every user who has a saved FCM token ---
exports.notifyOnRoomLive = onDocumentUpdated("rooms/{roomId}", async (event) => {
 const before = event.data.before.data();
 const after = event.data.after.data();
 if (before.status === "live" || after.status !== "live") return; // only fire on the transition

 const usersSnap = await db.collection("users").get();
 const tokens = usersSnap.docs.flatMap((d) => d.data().fcmTokens || []);

 await sendToTokens(
 tokens,
 { title: `${after.hostName || "Someone"} is live`, body: "Tap to join the room now" },
 { url: `/room/${event.params.roomId}` }
 );
});

// --- 3. New recharge (coin purchase) request: push + email the admin --
exports.notifyAdminOnRecharge = onDocumentCreated("rechargeRequests/{requestId}", async (event) => {
 const request = event.data.data();
 if (request.status !== "pending") return;

 const { tokens, emails } = await getAdminTokensAndEmails();

 await sendToTokens(
 tokens,
 {
 title: "New recharge request",
 body: `${request.name || "A user"} ne ${request.coins} coins (Rs ${request.priceRs}) ke liye payment bheji hai.`,
 },
 { url: "/admin" }
 );

 // Requires the "Trigger Email from Firestore" extension to be installed
 // and configured with your SMTP/Gmail credentials — see file header.
 await Promise.all(
 emails.map((to) =>
 db.collection("mail").add({
 to,
 message: {
 subject: `New recharge request — ${request.coins} coins (Rs ${request.priceRs})`,
 text: `${request.name || "A user"} (uid: ${request.uid}) submitted a recharge request for ${request.coins} coins, Rs ${request.priceRs}, via ${request.method || "unspecified"}.\n\nReview and approve it here: https://YOUR_DOMAIN/admin`,
 },
 })
 )
 );
});

// --- 3b. Referral bonus on signup ---------------------------------------
// Coins can never be trusted from the browser, so awarding the referral
// bonus happens here (Admin SDK), never in client code. Fires once per new
// user doc. Schema:
// - config/referral: { enabled, coinsPerReferral, expiresAt } — admin
// controlled from /admin, see lib/referral.js setReferralConfig().
// - users/{uid}.referralCode: this user's own shareable code.
// - users/{uid}.referredByCode: set at signup if they came from a
// ?ref=<code> link (app/signup/page.js).
// - referrals/{newUid}: audit trail + guards against double-crediting if
// this function is ever retried by Cloud Functions' at-least-once delivery.
exports.awardReferralBonus = onDocumentCreated("users/{uid}", async (event) => {
 const newUid = event.params.uid;
 const newUser = event.data.data();
 const refCode = newUser.referredByCode;
 if (!refCode) return;

 // Retry guard: if a referrals doc already exists for this new user, this
 // invocation already ran (or is racing another one) — bail out.
 const referralRef = db.collection("referrals").doc(newUid);
 const already = await referralRef.get();
 if (already.exists) return;

 const configSnap = await db.collection("config").doc("referral").get();
 if (!configSnap.exists) return;
 const config = configSnap.data();
 if (!config.enabled) return;
 if (config.expiresAt && config.expiresAt.toDate() < new Date()) return;

 const coins = Number(config.coinsPerReferral) || 0;
 if (coins <= 0) return;

 const referrerSnap = await db.collection("users").where("referralCode", "==", refCode).limit(1).get();
 if (referrerSnap.empty) return;
 const referrerDoc = referrerSnap.docs[0];
 const referrerId = referrerDoc.id;
 if (referrerId === newUid) return; // can't refer yourself

 await db.runTransaction(async (tx) => {
 const freshReferralSnap = await tx.get(referralRef);
 if (freshReferralSnap.exists) return; // lost the race to another invocation
 const referrerRef = db.collection("users").doc(referrerId);
 tx.update(referrerRef, { coins: FieldValue.increment(coins) });
 tx.set(referralRef, {
 referrerId,
 newUserId: newUid,
 coinsAwarded: coins,
 code: refCode,
 createdAt: FieldValue.serverTimestamp(),
 });
 tx.set(db.collection("notifications").doc(referrerId).collection("items").doc(), {
 type: "system",
 fromUid: null,
 fromName: null,
 fromAvatar: null,
 title: "🎉 Referral Bonus!",
 body: `You earned ${coins.toLocaleString()} coins for inviting a friend to Milaap!`,
 link: "/wallet",
 read: false,
 createdAt: FieldValue.serverTimestamp(),
 });
 });
});

// --- 4. Server-authoritative Ludo ------------------------------------
// IMPORTANT: coins, match state and dice settlement are never
// trusted from the browser. All paid Ludo operations run here with Admin SDK.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { randomInt } = require("crypto");
const { COLORS, FINISH_STEP, createInitialTokens, getMovableTokens, applyMove } = require("./ludoEngine");

const LUDO_STAKES = new Set([1000, 5000, 10000, 25000, 50000]);
const LUDO_MATCHES = "ludoMatches";

function requireAuth(request) {
 if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
 return request.auth.uid;
}
function cleanName(name) {
 return String(name || "Player").replace(/[<>]/g, "").slice(0, 40) || "Player";
}
function countFor(v) { return Number(v) === 4 ? 4 : 2; }
// Coin-to-coin payout: winner gets the full pot back in Coins. No Diamond conversion.
function coinsWonFor(pot) { return Number(pot || 0); }
function nextTurn(data) { return (Number(data.turnIdx || 0) + 1) % data.activeColors.length; }

exports.ludoCreate = onCall(async (request) => {
 const uid = requireAuth(request);
 const stake = Number(request.data?.stake);
 const playerCount = countFor(request.data?.playerCount);
 const mode = request.data?.mode === "room" ? "room" : "quick";
 if (!LUDO_STAKES.has(stake)) throw new HttpsError("invalid-argument", "Invalid entry amount.");
 const ref = db.collection(LUDO_MATCHES).doc();
 const roomCode = String(randomInt(100000, 1000000));
 const colors = COLORS.slice(0, playerCount);
 await db.runTransaction(async (tx) => {
 const userRef = db.collection("users").doc(uid);
 const user = await tx.get(userRef);
 if (!user.exists) throw new HttpsError("failed-precondition", "Profile not found.");
 const coins = Number(user.data().coins || 0);
 if (coins < stake) throw new HttpsError("failed-precondition", "Coins kam hain.");
 tx.update(userRef, { coins: coins - stake });
 tx.create(ref, {
 hostUid: uid, stake, mode, roomCode, status: "waiting", playerCount,
 pot: stake * playerCount, players: [{ uid, name: cleanName(request.data?.name), color: colors[0] }],
 playerUids: [uid], activeColors: colors, tokensByColor: createInitialTokens(colors),
 turnIdx: 0, diceValue: null, canRoll: false, selectableIds: [], sixStreak: 0,
 winner: null, coinsWon: null, createdAt: new Date(), serverVersion: 1,
 });
 });
 return { matchId: ref.id, roomCode };
});

exports.ludoJoin = onCall(async (request) => {
 const uid = requireAuth(request);
 const matchId = String(request.data?.matchId || "");
 if (!matchId) throw new HttpsError("invalid-argument", "Match id required.");
 const ref = db.collection(LUDO_MATCHES).doc(matchId);
 await db.runTransaction(async (tx) => {
 const snap = await tx.get(ref);
 if (!snap.exists) throw new HttpsError("not-found", "Match nahi mila.");
 const data = snap.data();
 if (data.status !== "waiting") throw new HttpsError("failed-precondition", "Match already started.");
 if ((data.playerUids || []).includes(uid)) return;
 const count = countFor(data.playerCount);
 if ((data.playerUids || []).length >= count) throw new HttpsError("failed-precondition", "Match full hai.");
 const userRef = db.collection("users").doc(uid);
 const user = await tx.get(userRef);
 if (!user.exists) throw new HttpsError("failed-precondition", "Profile not found.");
 const coins = Number(user.data().coins || 0);
 if (coins < Number(data.stake)) throw new HttpsError("failed-precondition", "Coins kam hain.");
 const used = new Set((data.players || []).map((p) => p.color));
 const color = (data.activeColors || COLORS.slice(0,count)).find((c) => !used.has(c));
 const players = [...(data.players || []), { uid, name: cleanName(request.data?.name), color }];
 const full = players.length === count;
 tx.update(userRef, { coins: coins - Number(data.stake) });
 tx.update(ref, { players, playerUids: players.map((p) => p.uid), status: full ? "playing" : "waiting", canRoll: full, startedAt: full ? new Date() : null, message: full ? "Game started" : `${players.length}/${count} players ready` });
 });
 return { matchId };
});

exports.ludoCancel = onCall(async (request) => {
 const uid = requireAuth(request);
 const matchId = String(request.data?.matchId || "");
 const ref = db.collection(LUDO_MATCHES).doc(matchId);
 await db.runTransaction(async (tx) => {
 const snap = await tx.get(ref);
 if (!snap.exists) return;
 const data = snap.data();
 if (data.hostUid !== uid) throw new HttpsError("permission-denied", "Only host can cancel.");
 if (data.status !== "waiting" || (data.playerUids || []).length !== 1) throw new HttpsError("failed-precondition", "Match cannot be cancelled now.");
 const userRef = db.collection("users").doc(uid);
 const user = await tx.get(userRef);
 if (!user.exists) throw new HttpsError("failed-precondition", "Profile not found.");
 tx.update(userRef, { coins: Number(user.data().coins || 0) + Number(data.stake) });
 tx.delete(ref);
 });
 return { ok: true };
});

exports.ludoRoll = onCall(async (request) => {
 const uid = requireAuth(request);
 const matchId = String(request.data?.matchId || "");
 const ref = db.collection(LUDO_MATCHES).doc(matchId);
 let result;
 await db.runTransaction(async (tx) => {
 const snap = await tx.get(ref);
 if (!snap.exists) throw new HttpsError("not-found", "Match nahi mila.");
 const data = snap.data();
 const player = (data.players || []).find((p) => p.uid === uid);
 const activeColor = data.activeColors?.[Number(data.turnIdx || 0)];
 if (data.status !== "playing" || !player || player.color !== activeColor || !data.canRoll) throw new HttpsError("failed-precondition", "Not your turn.");
 const dice = randomInt(1, 7);
 const movable = getMovableTokens(data.tokensByColor, activeColor, dice);
 if (!movable.length) {
 tx.update(ref, { diceValue: dice, selectableIds: [], canRoll: true, turnIdx: nextTurn(data), sixStreak: 0, message: "No move — next turn" });
 result = { dice, autoMoved: false, selectableIds: [], noMove: true };
 return;
 }
 if (movable.length === 1) {
 const out = applyMove(data.tokensByColor, activeColor, movable[0].id, dice);
 if (out.won) {
 const coinsWon = coinsWonFor(data.pot);
 const winnerRef = db.collection("users").doc(uid);
 const winner = await tx.get(winnerRef);
 tx.update(winnerRef, { coins: Number(winner.data().coins || 0) + coinsWon });
 tx.update(ref, { tokensByColor: out.tokensByColor, diceValue: dice, selectableIds: [], canRoll: false, status: "finished", winner: uid, coinsWon, settledAt: new Date(), message: "Winner!" });
 result = { dice, autoMoved: true, finished: true, coinsWon };
 return;
 }
 const six = dice === 6 ? Number(data.sixStreak || 0) + 1 : 0;
 const keep = dice === 6 && six < 3;
 tx.update(ref, { tokensByColor: out.tokensByColor, diceValue: dice, selectableIds: [], canRoll: true, sixStreak: keep ? six : 0, turnIdx: keep ? data.turnIdx : nextTurn(data), message: keep ? "6 aya — dobara roll karein" : "Next turn" });
 result = { dice, autoMoved: true, finished: false };
 return;
 }
 tx.update(ref, { diceValue: dice, selectableIds: movable.map((t) => t.id), canRoll: false, message: "Token select karein." });
 result = { dice, autoMoved: false, selectableIds: movable.map((t) => t.id) };
 });
 return result;
});

exports.ludoMove = onCall(async (request) => {
 const uid = requireAuth(request);
 const matchId = String(request.data?.matchId || "");
 const tokenId = String(request.data?.tokenId || "");
 const ref = db.collection(LUDO_MATCHES).doc(matchId);
 let result;
 await db.runTransaction(async (tx) => {
 const snap = await tx.get(ref);
 if (!snap.exists) throw new HttpsError("not-found", "Match nahi mila.");
 const data = snap.data();
 const player = (data.players || []).find((p) => p.uid === uid);
 const color = data.activeColors?.[Number(data.turnIdx || 0)];
 if (data.status !== "playing" || !player || player.color !== color || data.canRoll) throw new HttpsError("failed-precondition", "Invalid turn.");
 if (!(data.selectableIds || []).includes(tokenId)) throw new HttpsError("invalid-argument", "Invalid token.");
 const dice = Number(data.diceValue);
 if (dice < 1 || dice > 6) throw new HttpsError("failed-precondition", "Invalid dice state.");
 const out = applyMove(data.tokensByColor, color, tokenId, dice);
 if (out.won) {
 const coinsWon = coinsWonFor(data.pot);
 const winnerRef = db.collection("users").doc(uid);
 const winner = await tx.get(winnerRef);
 tx.update(winnerRef, { coins: Number(winner.data().coins || 0) + coinsWon });
 tx.update(ref, { tokensByColor: out.tokensByColor, selectableIds: [], canRoll: false, status: "finished", winner: uid, coinsWon, settledAt: new Date(), message: "Winner!" });
 result = { finished: true, coinsWon };
 return;
 }
 const six = dice === 6 ? Number(data.sixStreak || 0) + 1 : 0;
 const keep = dice === 6 && six < 3;
 tx.update(ref, { tokensByColor: out.tokensByColor, selectableIds: [], canRoll: true, sixStreak: keep ? six : 0, turnIdx: keep ? data.turnIdx : nextTurn(data), message: keep ? "6 aya — dobara roll karein" : "Next turn" });
 result = { finished: false };
 });
 return result;
});


// --- Production-safe host earnings withdrawals -----------------------
// Cash withdrawals are ONLY for withdrawal-eligible Diamonds (e.g. host
// earnings from gifts). Purchased Coins and game-entry Coins are never
// converted into cash here. All balance reservation and status changes
// happen with the Admin SDK so clients cannot mint or double-spend funds.

const WITHDRAWAL_METHODS = new Set(["JazzCash", "Easypaisa", "Bank"]);
const MIN_WITHDRAWAL_DIAMONDS = 1000;
const RUPEES_PER_DIAMOND = 4;

function requireAdmin(request) {
  const uid = requireAuth(request);
  const email = String(request.auth.token.email || "");
  const isHardcoded = email === "abdulhadi7888888@gmail.com";
  if (isHardcoded) return uid;
  return db.collection("users").doc(uid).get().then(snap => {
    if (!snap.exists || snap.data().role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required.");
    }
    return uid;
  });
}

exports.requestWithdrawal = onCall(async (request) => {
  const uid = requireAuth(request);
  const diamonds = Math.floor(Number(request.data?.diamonds || 0));
  const method = String(request.data?.method || "");
  const accountName = cleanName(request.data?.accountName);
  const account = String(request.data?.account || "").trim().slice(0, 80);

  if (!WITHDRAWAL_METHODS.has(method)) {
    throw new HttpsError("invalid-argument", "Invalid withdrawal method.");
  }
  if (!Number.isFinite(diamonds) || diamonds < MIN_WITHDRAWAL_DIAMONDS) {
    throw new HttpsError("invalid-argument", `Minimum withdrawal is ${MIN_WITHDRAWAL_DIAMONDS} Diamonds.`);
  }
  if (!account || account.length < 5) {
    throw new HttpsError("invalid-argument", "Valid payout account is required.");
  }

  const withdrawalRef = db.collection("withdrawalRequests").doc();
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new HttpsError("failed-precondition", "Profile not found.");
    const u = snap.data();
    if (u.kycStatus !== "verified") {
      throw new HttpsError("failed-precondition", "KYC verification is required before withdrawal.");
    }

    // Only server-tracked eligible Diamonds may be withdrawn.
    const eligible = Math.floor(Number(u.withdrawableDiamonds ?? u.diamonds ?? 0));
    if (diamonds > eligible) {
      throw new HttpsError("failed-precondition", "Insufficient withdrawal-eligible Diamonds.");
    }

    const remaining = eligible - diamonds;
    tx.update(userRef, {
      withdrawableDiamonds: remaining,
      // Keep the legacy display balance in sync when it is being used as the
      // eligible source. This does not touch Coins.
      ...(u.withdrawableDiamonds == null ? { diamonds: remaining } : {}),
    });

    tx.create(withdrawalRef, {
      uid,
      accountName,
      account,
      method,
      diamonds,
      rupees: diamonds * RUPEES_PER_DIAMOND,
      status: "pending",
      source: "host_earnings",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(db.collection("walletLedger").doc(), {
      uid,
      type: "withdrawal_hold",
      diamonds: -diamonds,
      rupees: diamonds * RUPEES_PER_DIAMOND,
      referenceId: withdrawalRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { requestId: withdrawalRef.id, status: "pending" };
});

exports.approveWithdrawal = onCall(async (request) => {
  await requireAdmin(request);
  const requestId = String(request.data?.requestId || "");
  if (!requestId) throw new HttpsError("invalid-argument", "Request ID required.");

  const ref = db.collection("withdrawalRequests").doc(requestId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Withdrawal request not found.");
    const data = snap.data();
    if (data.status !== "pending") {
      throw new HttpsError("failed-precondition", "Request is no longer pending.");
    }
    tx.update(ref, {
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("walletLedger").doc(), {
      uid: data.uid,
      type: "withdrawal_approved",
      diamonds: -Number(data.diamonds || 0),
      rupees: Number(data.rupees || 0),
      referenceId: requestId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

exports.markWithdrawalPaid = onCall(async (request) => {
  await requireAdmin(request);
  const requestId = String(request.data?.requestId || "");
  const paymentReference = String(request.data?.paymentReference || "").trim().slice(0, 120);
  if (!requestId) throw new HttpsError("invalid-argument", "Request ID required.");
  if (!paymentReference) throw new HttpsError("invalid-argument", "Payment reference / transaction ID is required.");

  const ref = db.collection("withdrawalRequests").doc(requestId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Withdrawal request not found.");
    const data = snap.data();
    if (data.status !== "approved") {
      throw new HttpsError("failed-precondition", "Approve the request first, then record the manual payment.");
    }
    tx.update(ref, {
      status: "paid",
      paymentMode: "manual",
      paymentReference,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("walletLedger").doc(), {
      uid: data.uid,
      type: "withdrawal_paid_manual",
      diamonds: 0,
      rupees: Number(data.rupees || 0),
      referenceId: requestId,
      paymentReference,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true, status: "paid" };
});

exports.rejectWithdrawal = onCall(async (request) => {
  await requireAdmin(request);
  const requestId = String(request.data?.requestId || "");
  if (!requestId) throw new HttpsError("invalid-argument", "Request ID required.");

  const ref = db.collection("withdrawalRequests").doc(requestId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Withdrawal request not found.");
    const data = snap.data();
    if (data.status !== "pending") {
      throw new HttpsError("failed-precondition", "Request is no longer pending.");
    }

    const userRef = db.collection("users").doc(data.uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "User profile not found.");

    const u = userSnap.data();
    const current = Math.floor(Number(u.withdrawableDiamonds ?? 0));
    tx.update(userRef, { withdrawableDiamonds: current + Number(data.diamonds || 0) });
    tx.update(ref, {
      status: "rejected",
      rejectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("walletLedger").doc(), {
      uid: data.uid,
      type: "withdrawal_release",
      diamonds: Number(data.diamonds || 0),
      rupees: Number(data.rupees || 0),
      referenceId: requestId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});
