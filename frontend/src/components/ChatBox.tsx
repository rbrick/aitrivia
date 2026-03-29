"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

const SENDER_COLORS = [
  "text-violet-300",
  "text-rose-300",
  "text-amber-300",
  "text-teal-300",
  "text-sky-300",
  "text-emerald-300",
];

function senderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return SENDER_COLORS[hash % SENDER_COLORS.length];
}

interface Props {
  messages: ChatMessage[];
  currentPlayerId: string | null;
  onSend: (text: string) => void;
}

export function ChatBox({ messages, currentPlayerId, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 flex flex-col overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-700/50 text-xs font-bold uppercase tracking-widest text-zinc-400">
        Chat
      </div>

      <div className="overflow-y-auto px-3 py-2 space-y-1.5 min-h-[100px] max-h-[180px]">
        {messages.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center pt-3 select-none">No messages yet</p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.playerId === currentPlayerId;
            const displayName = msg.playerName || msg.playerId;
            return (
              <div key={i} className="flex gap-1.5 text-sm leading-snug">
                <span className={`font-semibold shrink-0 ${senderColor(displayName)}`}>
                  {displayName}
                  {isMe && <span className="ml-1 text-xs font-normal text-zinc-500">(you)</span>}
                  {":"}
                </span>
                <span className="text-zinc-200 break-words min-w-0">{msg.text}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-zinc-700/50 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Say something…"
          maxLength={200}
          className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
