"use client";

import Link from "next/link";
import { ChatThread } from "./chat-thread";
import { ExternalLink } from "lucide-react";

export function ChatPanel({ onRequestFullView }: { onRequestFullView?: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-end border-b px-4 py-2">
        <Link
          href="/assistant"
          onClick={onRequestFullView}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Open in full view <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <ChatThread compact />
    </div>
  );
}
