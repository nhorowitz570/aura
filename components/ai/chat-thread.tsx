"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatInput } from "./chat-input";
import { ChatMessage, type Message } from "./chat-message";

export function ChatThread({ compact = false, threadId: initialThreadId }: { compact?: boolean; threadId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadId) return;
    let cancel = false;
    (async () => {
      const res = await fetch(`/api/ai/thread?id=${threadId}`, { cache: "no-store" });
      if (!res.ok || cancel) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    })();
    return () => { cancel = true; };
  }, [threadId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (content: string, attachment?: { name: string; data: string }) => {
    if (!content.trim() && !attachment) return;
    const optimistic: Message = { id: crypto.randomUUID(), role: "user", content, attachment };
    const pendingId = `pending-${crypto.randomUUID()}`;
    setMessages((xs) => [...xs, optimistic, { id: pendingId, role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, content, attachment }),
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let nextThreadId = threadId;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // SSE-style "data: {...}\n\n"
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "thread") nextThreadId = evt.threadId;
            else if (evt.type === "delta") {
              acc += evt.text;
              setMessages((xs) => {
                const copy = [...xs];
                copy[copy.length - 1] = { id: pendingId, role: "assistant", content: acc };
                return copy;
              });
            } else if (evt.type === "done") {
              setMessages((xs) => {
                const copy = [...xs];
                copy[copy.length - 1] = { id: evt.id ?? crypto.randomUUID(), role: "assistant", content: acc };
                return copy;
              });
            } else if (evt.type === "tool") {
              setMessages((xs) => [...xs, { id: crypto.randomUUID(), role: "tool", content: `🔧 ${evt.name}` }]);
            } else if (evt.type === "error") {
              toast.error(evt.message ?? "Assistant error");
            }
          } catch {/* ignore malformed line */}
        }
      }
      if (nextThreadId && nextThreadId !== threadId) setThreadId(nextThreadId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
      setMessages((xs) => xs.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Ask anything — logging meals, water, workouts, weight, or your trends.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id}><ChatMessage message={m} /></li>
            ))}
          </ul>
        )}
      </div>
      <div className={"border-t bg-background px-3 py-3 " + (compact ? "pb-safe" : "")}>
        <ChatInput disabled={streaming} onSend={send} />
      </div>
    </div>
  );
}
