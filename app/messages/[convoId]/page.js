"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getUserProfile, listenMessages, sendTextMessage, sendVoiceMessage } from "@/lib/dm";
import VoiceRecorder from "@/components/VoiceRecorder";

export default function ConversationPage() {
 const { convoId } = useParams(); const { user, loading } = useAuth(); const router = useRouter();
 const [messages, setMessages] = useState([]); const [other, setOther] = useState(null); const [text, setText] = useState(""); const [sending, setSending] = useState(false); const bottomRef = useRef(null);
 const otherUid = useMemo(() => (convoId || "").split("_").find((id) => id !== user?.uid), [convoId, user?.uid]);
 useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
 useEffect(() => { if (!convoId) return; return listenMessages(convoId, setMessages); }, [convoId]);
 useEffect(() => { if (otherUid) getUserProfile(otherUid).then(setOther).catch(() => {}); }, [otherUid]);
 useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);
 async function submit() { if (!text.trim() || !otherUid || sending) return; setSending(true); const value=text; setText(""); try { await sendTextMessage(user.uid, otherUid, user.uid, value); } finally { setSending(false); } }
 async function voice(blob, duration) { if (!otherUid) return; setSending(true); try { await sendVoiceMessage(user.uid, otherUid, user.uid, blob, duration); } finally { setSending(false); } }
 if (loading || !user) return <main className="flex min-h-screen items-center justify-center bg-void text-mist">Loading…</main>;
 return <main className="flex min-h-screen flex-col bg-void">
 <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/8 bg-void/88 px-4 pb-3 pt-5 backdrop-blur-xl">
 <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-panel text-lg text-white/70">‹</button>
 <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-400/25 text-sm font-bold text-white">{other?.photoURL ? <img src={other.photoURL} alt="" className="h-full w-full object-cover" /> : (other?.displayName || "U").slice(0,1).toUpperCase()}</div>
 <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{other?.displayName || "User"}</p><p className="text-[10px] text-emerald-300">Live chat</p></div><button className="rounded-full bg-panel px-3 py-2 text-xs text-white/70">⋯</button>
 </header>
 <section className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
 <div className="mx-auto mb-5 max-w-xs rounded-2xl border border-white/6 bg-panel px-4 py-3 text-center text-[11px] leading-5 text-white/40">Messages are delivered in real time. Never share passwords or payment codes.</div>
 {messages.map((m) => { const mine=m.uid===user.uid; return <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${mine?"rounded-br-md bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white":"rounded-bl-md bg-panel text-white/90 ring-1 ring-white/6"}`}>{m.type==="voice"?<audio controls src={m.audioUrl} className="max-w-full"/>:m.text}</div></div>; })}<div ref={bottomRef}/>
 </section>
 <div className="sticky bottom-0 border-t border-white/8 bg-void/92 px-3 py-3 pb-safe backdrop-blur-xl"><div className="mx-auto flex max-w-md items-end gap-2 rounded-2xl border border-white/8 bg-panel p-2"><VoiceRecorder disabled={sending} onRecorded={voice}/><textarea value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}} rows={1} placeholder="Write a message…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/30"/><button disabled={sending||!text.trim()} onClick={submit} className="h-10 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 text-xs font-bold text-white disabled:opacity-40">Send</button></div></div>
 </main>;
}
