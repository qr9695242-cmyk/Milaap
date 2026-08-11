"use client";

import { useEffect, useRef, useState } from "react";
import { listenChat, sendChatMessage } from "@/lib/chat";
import { VIP_TIERS } from "@/lib/vip";
import VipBadge from "@/components/VipBadge";

export default function LiveChat({ roomId, uid, name, vipLevel = 0, onOpenGifts, onSendHeart }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef(null);

  const myTier = VIP_TIERS[Math.max(0, Math.min(vipLevel, VIP_TIERS.length - 1))];
  const exclusiveEmojis = myTier?.emojis || [];

  useEffect(() => {
    const unsub = listenChat(roomId, setMessages);
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const toSend = text;
    setText("");
    await sendChatMessage(roomId, { uid, name, text: toSend, vipLevel });
  }

  function addEmoji(emoji) {
    setText((t) => t + emoji);
    setShowEmojis(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-mist">
            Say hi to start the chat 👋
          </p>
        )}
        {messages.map((m) =>
          m.type === "entry" ? (
            <div
              key={m.id}
              className="my-1 flex items-center justify-center rounded-full px-3 py-1 text-center text-[11px] font-semibold"
              style={{
                background: `linear-gradient(90deg, ${VIP_TIERS[m.vipLevel]?.color}33, transparent)`,
                color: VIP_TIERS[m.vipLevel]?.color,
              }}
            >
              {VIP_TIERS[m.vipLevel]?.level === 4 ? "★" : "◆"} {m.text}
            </div>
          ) : (
            <p key={m.id} className="text-sm leading-snug">
              <span className="font-semibold text-neon-violet">{m.name} </span>
              {m.vipLevel > 0 && <VipBadge vipLevel={m.vipLevel} compact />}{" "}
              <span className="text-ink/90">{m.text}</span>
            </p>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {showEmojis && exclusiveEmojis.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/5 px-3 py-2">
          {exclusiveEmojis.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="rounded-lg bg-panel px-2 py-1 text-lg ring-1 ring-white/5"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-white/5 p-2"
      >
        {exclusiveEmojis.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmojis((s) => !s)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel text-base ring-1 ring-white/5"
            title="Exclusive VIP emojis"
          >
            👑
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          maxLength={300}
          className="flex-1 rounded-full bg-panel2 px-4 py-2 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
        />
        {onOpenGifts && (
          <button
            type="button"
            onClick={onOpenGifts}
            aria-label="Send a gift"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel text-lg ring-1 ring-white/5"
          >
            🎁
          </button>
        )}
        {onSendHeart && (
          <button
            type="button"
            onClick={onSendHeart}
            aria-label="Send a heart"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel text-lg ring-1 ring-white/5 active:scale-90 transition-transform"
          >
            ❤️
          </button>
        )}
        <button
          type="submit"
          className="rounded-full bg-glow-gradient px-4 py-2 text-sm font-semibold text-ink"
        >
          Send
        </button>
      </form>
    </div>
  );
}
