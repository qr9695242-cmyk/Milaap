// Private messages between two users — text and voice notes.
// Conversation id is deterministic: the two uids sorted & joined, so both
// sides always resolve to the same conversation doc without a lookup.
//
// Firestore layout:
// conversations/{convoId} — { members:[uidA,uidB], updatedAt, lastMessage, lastSenderUid }
// conversations/{convoId}/messages/{id} — { uid, type:"text"|"voice", text?, audioUrl?, durationSec?, createdAt }

import {
 doc,
 getDoc,
 setDoc,
 addDoc,
 updateDoc,
 collection,
 query,
 where,
 orderBy,
 limitToLast,
 onSnapshot,
 serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";
import { createNotification } from "./notifications";

/** Fetches a user's public profile fields (name/photo) for DM headers/lists. */
export async function getUserProfile(uid) {
 const snap = await getDoc(doc(db, "users", uid));
 return snap.exists() ? { uid, ...snap.data() } : null;
}

export function conversationId(uidA, uidB) {
 return [uidA, uidB].sort().join("_");
}

/** Ensures the conversation doc exists (idempotent). */
export async function ensureConversation(uidA, uidB) {
 const id = conversationId(uidA, uidB);
 await setDoc(
 doc(db, "conversations", id),
 { members: [uidA, uidB].sort(), updatedAt: serverTimestamp() },
 { merge: true }
 );
 return id;
}

/** Live list of the current user's conversations, most recently active first. */
export function listenConversations(uid, callback) {
 const q = query(
 collection(db, "conversations"),
 where("members", "array-contains", uid),
 orderBy("updatedAt", "desc")
 );
 return onSnapshot(q, (snap) => {
 callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
 });
}

/** Live list of messages in one conversation, oldest first. */
export function listenMessages(convoId, callback, max = 200) {
 const q = query(
 collection(db, "conversations", convoId, "messages"),
 orderBy("createdAt", "asc"),
 limitToLast(max)
 );
 return onSnapshot(q, (snap) => {
 callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
 });
}

async function touchConversation(convoId, uid, lastMessage) {
 await updateDoc(doc(db, "conversations", convoId), {
 updatedAt: serverTimestamp(),
 lastMessage,
 lastSenderUid: uid,
 });
}

export async function sendTextMessage(uidA, uidB, uid, text) {
 const trimmed = text.trim();
 if (!trimmed) return;
 const convoId = await ensureConversation(uidA, uidB);
 await addDoc(collection(db, "conversations", convoId, "messages"), {
 uid,
 type: "text",
 text: trimmed.slice(0, 1000),
 createdAt: serverTimestamp(),
 });
 await touchConversation(convoId, uid, trimmed.slice(0, 80));
 const sender = await getUserProfile(uid);
 await createNotification(uidB, { type: "message", fromUid: uid, fromName: sender?.displayName || "User", fromAvatar: sender?.photoURL || null, title: sender?.displayName || "New message", body: trimmed.slice(0, 100), link: `/messages/${convoId}` });
}

/**
 * Uploads a recorded voice note (Blob from MediaRecorder) to Cloudinary
 * and writes the message doc pointing at it.
 */
export async function sendVoiceMessage(uidA, uidB, uid, audioBlob, durationSec) {
 const convoId = await ensureConversation(uidA, uidB);
 const { url: audioUrl } = await uploadToCloudinary(
 audioBlob,
 `milaap/voice-messages/${convoId}`
 );

 await addDoc(collection(db, "conversations", convoId, "messages"), {
 uid,
 type: "voice",
 audioUrl,
 durationSec: Math.round(durationSec || 0),
 createdAt: serverTimestamp(),
 });
 await touchConversation(convoId, uid, "🎤 Voice message");
 const sender = await getUserProfile(uid);
 await createNotification(uidB, { type: "message", fromUid: uid, fromName: sender?.displayName || "User", fromAvatar: sender?.photoURL || null, title: sender?.displayName || "New voice message", body: "🎤 Voice message", link: `/messages/${convoId}` });
}
