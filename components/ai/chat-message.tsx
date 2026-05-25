"use client";

import { cn } from "@/lib/utils";

export type Message = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  attachment?: { name: string; data: string };
};

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "tool") {
    return <p className="text-[11px] text-muted-foreground">{message.content}</p>;
  }
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm",
          isUser ? "bg-secondary" : "bg-transparent",
        )}
      >
        {message.attachment && (
          <p className="mb-1 text-[11px] text-muted-foreground">📎 {message.attachment.name}</p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content || (isUser ? "" : "…")}</p>
      </div>
    </div>
  );
}
