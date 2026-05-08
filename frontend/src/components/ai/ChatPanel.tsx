"use client";

import { useState } from "react";
import type { AiMessage } from "@/types/ai";

interface Props {
  onClose: () => void;
}

export function ChatPanel({ onClose }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hi — I’m NexusAid AI. I can help with volunteering, donations, event discovery, and platform questions.",
    },
  ]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextUserMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I hit an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[360px] rounded-2xl border border-neutral-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold text-neutral-900">Ask NexusAid AI</h3>
          <p className="text-xs text-neutral-500">Chat for quick help</p>
        </div>
        <button onClick={onClose} className="text-sm text-neutral-500 hover:text-black">
          Close
        </button>
      </div>

      <div className="h-[420px] space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-auto bg-[#4E7B57] text-white"
                : "bg-neutral-100 text-neutral-900"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
            Thinking...
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about volunteering, donations, events..."
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4E7B57]"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="rounded-xl bg-[#4E7B57] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}