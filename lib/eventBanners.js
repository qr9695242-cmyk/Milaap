// Occasion / Event banners — e.g. an "Eid Mubarak" banner with its own
// picture, that hands out a coin reward (and/or points at a gift) when a
// user taps it. Fully admin-managed from /admin ("Occasion Banners"):
// upload a picture, set the text, optionally attach coins and/or a gift
// from the catalog, and it shows up in the rotating banner strip
// (components/EventBanner.jsx) above the room video stage.
//
// Storage: a Firestore collection "eventBanners". Each doc:
// { title, imageUrl, href, coins, giftId, active, createdAt }
// Public read (so every signed-in user's banner strip can show it),
// admin-only write — same shape as config/{docId} in firestore.rules,
// just its own collection so we can list/order many of them.
//
// Coin rewards are claim-once-per-user: claiming writes
// eventBanners/{id}/claims/{uid}, and the credit itself happens inside a
// transaction that checks that doc doesn't already exist — so refreshing
// or tapping twice can't double-claim.
import {
 collection,
 doc,
 addDoc,
 deleteDoc,
 updateDoc,
 getDoc,
 query,
 orderBy,
 onSnapshot,
 serverTimestamp,
 runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "eventBanners";

/** Admin: live list of every banner (active or not), newest first. */
export function listenAllEventBanners(onData, onError) {
 const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
 return onSnapshot(
 q,
 (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
 onError
 );
}

/** Everyone: live list of active banners only, for the rotating strip. */
export function listenActiveEventBanners(onData, onError) {
 const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
 return onSnapshot(
 q,
 (snap) =>
 onData(
 snap.docs
 .map((d) => ({ id: d.id, ...d.data() }))
 .filter((b) => b.active !== false)
 ),
 onError
 );
}

/**
 * Admin: create a new occasion banner.
 * @param {{title:string, imageUrl:string, href?:string, coins?:number, giftId?:string, giftIcon?:string}} data
 */
export async function createEventBanner(data) {
 if (!data.title?.trim()) throw new Error("Banner ka title likhein.");
 if (!data.imageUrl?.trim()) throw new Error("Pehle picture upload karein.");
 await addDoc(collection(db, COLLECTION), {
 title: data.title.trim(),
 imageUrl: data.imageUrl,
 href: data.href?.trim() || "",
 coins: Number(data.coins) > 0 ? Number(data.coins) : 0,
 giftId: data.giftId || "",
 giftIcon: data.giftIcon || "",
 active: true,
 createdAt: serverTimestamp(),
 });
}

/** Admin: toggle a banner on/off without deleting it. */
export async function setEventBannerActive(id, active) {
 await updateDoc(doc(db, COLLECTION, id), { active });
}

/** Admin: remove a banner for good. */
export async function deleteEventBanner(id) {
 await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * User taps a banner that has a coin reward attached: credits the coins
 * once per user, ever. Safe to call even if the banner has 0 coins (it
 * just no-ops) so the UI doesn't need to branch on that itself.
 */
export async function claimEventBanner(uid, bannerId) {
 const bannerRef = doc(db, COLLECTION, bannerId);
 const bannerSnap = await getDoc(bannerRef);
 if (!bannerSnap.exists()) throw new Error("Ye banner ab mojood nahi hai.");
 const banner = bannerSnap.data();
 const coins = Number(banner.coins) || 0;
 if (coins <= 0) return { coinsGained: 0, alreadyClaimed: false };

 const claimRef = doc(db, COLLECTION, bannerId, "claims", uid);
 const userRef = doc(db, "users", uid);

 const result = await runTransaction(db, async (tx) => {
 const claimSnap = await tx.get(claimRef);
 if (claimSnap.exists()) return { coinsGained: 0, alreadyClaimed: true };
 const userSnap = await tx.get(userRef);
 if (!userSnap.exists()) throw new Error("User not found");
 const currentCoins = userSnap.data().coins || 0;
 tx.update(userRef, { coins: currentCoins + coins });
 tx.set(claimRef, { claimedAt: serverTimestamp(), coins });
 return { coinsGained: coins, alreadyClaimed: false };
 });

 return result;
}
