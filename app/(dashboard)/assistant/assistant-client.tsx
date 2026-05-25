"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  MessageSquarePlus, Menu, MoreVertical, Pencil, Trash2, Check, X,
  Send, Square, Copy, RefreshCw, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { deleteThread, renameThread } from "@/server/actions/threads";

type ThreadSummary = { id: string; title: string | null; last_message_at: string };

type MsgRole = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: MsgRole;
  content: string;
  /** For user messages: array of edited variants (branches). The 0th is the original. */
  branches?: { content: string; assistant: string | null }[];
  /** Index into branches that is currently active. */
  branchIndex?: number;
};

const SUGGESTED = [
  { label: "Plan today's meals around my goals", prompt: "Help me plan today's meals to hit my calorie and protein goals." },
  { label: "Log 24 oz of water", prompt: "Log 24 oz of water for me." },
  { label: "Suggest a 30-minute workout", prompt: "Suggest a 30-minute workout I can do at home." },
  { label: "How did I sleep this week?", prompt: "Summarize my sleep over the past 7 days." },
];

export function AssistantClient({ threads: initialThreads }: { threads: ThreadSummary[] }) {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined); // always start with a new chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<ThreadSummary | null>(null);
  const [renameFor, setRenameFor] = useState<ThreadSummary | null>(null);
  const [renameText, setRenameText] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const hasMessages = messages.length > 0;

  // Long-press helpers (mobile)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = (t: ThreadSummary) => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) try { navigator.vibrate(8); } catch {/* */}
      setActionsFor(t);
    }, 480);
  };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  // Load messages when active thread changes.
  useEffect(() => {
    if (!activeThreadId) { setMessages([]); return; }
    let cancel = false;
    (async () => {
      const res = await fetch(`/api/ai/thread?id=${activeThreadId}`, { cache: "no-store" });
      if (!res.ok || cancel) return;
      const data = await res.json();
      const loaded: ChatMessage[] = (data.messages ?? [])
        .filter((m: { role: string }) => m.role !== "tool")
        .map((m: { id: string; role: MsgRole; content: string }) => ({ id: m.id, role: m.role, content: m.content }));
      setMessages(loaded);
    })();
    return () => { cancel = true; };
  }, [activeThreadId]);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Stop on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveThreadId(undefined);
    setMessages([]);
    setInput("");
    setEditingMsgId(null);
    setDrawerOpen(false);
  }, []);

  const send = useCallback(async (content: string, opts?: { replacePrevUserId?: string }) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic insert. If we're editing a prior message, we replace from that point.
    let pendingMessages: ChatMessage[] = [];
    setMessages((xs) => {
      let base = xs;
      if (opts?.replacePrevUserId) {
        const idx = xs.findIndex((m) => m.id === opts.replacePrevUserId);
        if (idx >= 0) {
          // Snapshot previous assistant reply (if any) as branch 0.
          const prev = xs[idx];
          const oldAssistant = xs[idx + 1]?.role === "assistant" ? xs[idx + 1].content : null;
          const oldBranches = prev.branches ?? [{ content: prev.content, assistant: oldAssistant }];
          const newBranches = [...oldBranches, { content: trimmed, assistant: null }];
          const newMsg: ChatMessage = {
            ...prev,
            content: trimmed,
            branches: newBranches,
            branchIndex: newBranches.length - 1,
          };
          base = [...xs.slice(0, idx), newMsg];
        }
      } else {
        base = [...xs, { id: crypto.randomUUID(), role: "user", content: trimmed }];
      }
      const pendingId = `pending-${crypto.randomUUID()}`;
      const next = [...base, { id: pendingId, role: "assistant" as const, content: "" }];
      pendingMessages = next;
      return next;
    });

    const pendingId = pendingMessages[pendingMessages.length - 1].id;
    setStreaming(true);
    setInput("");
    setEditingMsgId(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: activeThreadId, content: trimmed }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let nextThreadId = activeThreadId;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "thread") nextThreadId = evt.threadId;
            else if (evt.type === "delta") {
              acc += evt.text;
              setMessages((xs) => xs.map((m) => (m.id === pendingId ? { ...m, content: acc } : m)));
            } else if (evt.type === "done") {
              setMessages((xs) => xs.map((m) => (m.id === pendingId ? { ...m, id: evt.id ?? pendingId, content: acc } : m)));
            } else if (evt.type === "error") {
              toast.error(evt.message ?? "Assistant error");
            }
          } catch {/* */}
        }
      }
      if (nextThreadId && nextThreadId !== activeThreadId) {
        setActiveThreadId(nextThreadId);
        // Refresh thread list — server adds it on first message.
        router.refresh();
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // User stopped — keep partial content as the assistant message.
      } else {
        toast.error(e instanceof Error ? e.message : "Chat failed");
        setMessages((xs) => xs.filter((m) => m.id !== pendingId));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [activeThreadId, router]);

  const stop = () => abortRef.current?.abort();

  // Switch between branches of an edited user message.
  const switchBranch = (msgId: string, delta: 1 | -1) => {
    setMessages((xs) => {
      const idx = xs.findIndex((m) => m.id === msgId);
      if (idx < 0) return xs;
      const m = xs[idx];
      if (!m.branches || m.branches.length < 2) return xs;
      const cur = m.branchIndex ?? m.branches.length - 1;
      const nextIdx = Math.max(0, Math.min(m.branches.length - 1, cur + delta));
      if (nextIdx === cur) return xs;
      const branch = m.branches[nextIdx];
      // Replace user content; replace the next assistant message if there is one.
      const before = xs.slice(0, idx);
      const updated: ChatMessage = { ...m, content: branch.content, branchIndex: nextIdx };
      const assistantId = xs[idx + 1]?.role === "assistant" ? xs[idx + 1].id : crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: branch.assistant ?? "(this branch isn't loaded — send a new message to regenerate)",
      };
      return [...before, updated, assistantMsg];
    });
  };

  const onDelete = (id: string) => {
    setActionsFor(null);
    if (!confirm("Delete this conversation?")) return;
    (async () => {
      const res = await deleteThread(id);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      setThreads((xs) => xs.filter((t) => t.id !== id));
      if (activeThreadId === id) newChat();
      toast.success("Conversation deleted");
      router.refresh();
    })();
  };

  const onRename = (id: string, title: string) => {
    (async () => {
      const res = await renameThread(id, title);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      setThreads((xs) => xs.map((t) => (t.id === id ? { ...t, title } : t)));
      setRenameFor(null);
      router.refresh();
    })();
  };

  const sidebarThreads = useMemo(() => threads, [threads]);

  return (
    <div className={cn(
      // Mobile: lock the chat between the sticky app header and fixed bottom tabs so only the
      // inner message scroller moves — top bars, sub-header and composer stay put.
      "fixed inset-x-0 top-14 z-20 flex flex-col overflow-hidden bg-background bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
      // Desktop: in-flow two-column grid as before.
      "md:static md:inset-auto md:top-auto md:bottom-auto md:z-auto md:-mx-8 md:grid md:h-[calc(100dvh-3.5rem)] md:grid-cols-[260px_1fr]",
    )}>
      {/* Desktop sidebar */}
      <aside className="hidden border-r md:flex md:flex-col">
        <div className="border-b p-3">
          <Button size="sm" variant="outline" className="w-full justify-start" onClick={newChat}>
            <MessageSquarePlus className="mr-1 h-4 w-4" /> New chat
          </Button>
        </div>
        <ThreadList
          threads={sidebarThreads}
          activeId={activeThreadId}
          onPick={(id) => setActiveThreadId(id)}
          onLongPressStart={startPress}
          onLongPressEnd={cancelPress}
          onMenu={(t) => setActionsFor(t)}
        />
      </aside>

      {/* Mobile drawer (left sheet) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="flex w-[88%] max-w-xs flex-col p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Conversations</SheetTitle>
            <SheetDescription className="sr-only">Past conversations</SheetDescription>
          </SheetHeader>
          <div className="p-3">
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={newChat}>
              <MessageSquarePlus className="mr-1 h-4 w-4" /> New chat
            </Button>
          </div>
          <ThreadList
            threads={sidebarThreads}
            activeId={activeThreadId}
            onPick={(id) => { setActiveThreadId(id); setDrawerOpen(false); }}
            onLongPressStart={startPress}
            onLongPressEnd={cancelPress}
            onMenu={(t) => setActionsFor(t)}
          />
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <section className="relative flex h-full min-h-0 flex-col">
        {/* Mobile header bar with hamburger */}
        <div className="flex items-center justify-between border-b px-3 py-2 md:hidden">
          <Button size="icon" variant="ghost" onClick={() => setDrawerOpen(true)} aria-label="Open conversations">
            <Menu className="h-5 w-5" />
          </Button>
          <p className="truncate text-sm font-medium">
            {activeThreadId ? (threads.find((t) => t.id === activeThreadId)?.title ?? "Chat") : "New chat"}
          </p>
          <Button size="icon" variant="ghost" onClick={newChat} aria-label="New chat">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!hasMessages ? (
            <motion.div
              key="empty"
              className="flex flex-1 flex-col items-center justify-center px-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <div className="mx-auto w-full max-w-2xl">
                <div className="mb-6 text-center">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <h2 className="text-xl font-semibold tracking-tight">How can I help today?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Log meals, water, workouts, weight — or ask about your trends.
                  </p>
                </div>
                <ComposerCard
                  value={input}
                  onChange={setInput}
                  streaming={streaming}
                  onSend={() => send(input)}
                  onStop={stop}
                />
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTED.map((s) => (
                    <motion.button
                      key={s.label}
                      type="button"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      onClick={() => send(s.prompt)}
                    >
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              className="flex flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-4 md:px-6">
                <ul className="mx-auto max-w-3xl space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                      <motion.li
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <MessageBubble
                          message={m}
                          isLast={i === messages.length - 1}
                          streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                          editing={editingMsgId === m.id}
                          editText={editText}
                          setEditText={setEditText}
                          startEdit={() => { setEditingMsgId(m.id); setEditText(m.content); }}
                          cancelEdit={() => setEditingMsgId(null)}
                          submitEdit={() => send(editText, { replacePrevUserId: m.id })}
                          switchBranch={(delta) => switchBranch(m.id, delta)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>

              <div className="border-t bg-background/95 px-3 py-3 backdrop-blur md:px-6">
                <div className="mx-auto max-w-3xl">
                  <ComposerCard
                    value={input}
                    onChange={setInput}
                    streaming={streaming}
                    onSend={() => send(input)}
                    onStop={stop}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Long-press action modal */}
      <Modal open={!!actionsFor} onOpenChange={(o) => !o && setActionsFor(null)}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle className="truncate">{actionsFor?.title || "New chat"}</ModalTitle>
            <ModalDescription>Conversation actions</ModalDescription>
          </ModalHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (actionsFor) {
                  setRenameFor(actionsFor);
                  setRenameText(actionsFor.title ?? "");
                  setActionsFor(null);
                }
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive"
              onClick={() => actionsFor && onDelete(actionsFor.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* Rename modal */}
      <Modal open={!!renameFor} onOpenChange={(o) => !o && setRenameFor(null)}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Rename conversation</ModalTitle>
            <ModalDescription>Give this chat a custom title.</ModalDescription>
          </ModalHeader>
          <Textarea
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            rows={2}
            className="text-sm"
            autoFocus
          />
          <ModalFooter>
            <Button variant="ghost" onClick={() => setRenameFor(null)}>Cancel</Button>
            <Button onClick={() => renameFor && onRename(renameFor.id, renameText.trim())}>
              <Check className="mr-1 h-4 w-4" /> Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

/* -------- subcomponents -------- */

function ThreadList({
  threads, activeId, onPick, onLongPressStart, onLongPressEnd, onMenu,
}: {
  threads: ThreadSummary[];
  activeId: string | undefined;
  onPick: (id: string) => void;
  onLongPressStart: (t: ThreadSummary) => void;
  onLongPressEnd: () => void;
  onMenu: (t: ThreadSummary) => void;
}) {
  return (
    <ul className="flex-1 overflow-y-auto">
      {threads.length === 0 && (
        <li className="px-4 py-6 text-center text-xs text-muted-foreground">No conversations yet.</li>
      )}
      <AnimatePresence initial={false}>
        {threads.map((t) => (
          <motion.li
            key={t.id}
            layout
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="group relative"
          >
            <button
              type="button"
              onClick={() => onPick(t.id)}
              onTouchStart={() => onLongPressStart(t)}
              onTouchEnd={onLongPressEnd}
              onTouchMove={onLongPressEnd}
              onContextMenu={(e) => { e.preventDefault(); onMenu(t); }}
              className={cn(
                "block w-full truncate px-4 py-2 pr-9 text-left text-sm transition-colors",
                activeId === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50",
              )}
            >
              {t.title || "New chat"}
            </button>
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100 md:focus:opacity-100"
              onClick={(e) => { e.stopPropagation(); onMenu(t); }}
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function ComposerCard({
  value, onChange, onSend, onStop, streaming,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  return (
    <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-foreground/30">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask anything…"
        rows={1}
        className="min-h-[40px] max-h-40 flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
        disabled={streaming}
      />
      {streaming ? (
        <Button type="button" size="icon" onClick={onStop} aria-label="Stop">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" size="icon" onClick={onSend} aria-label="Send" disabled={!value.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function MessageBubble({
  message, streaming, editing, editText, setEditText, startEdit, cancelEdit, submitEdit, switchBranch,
}: {
  message: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  editing: boolean;
  editText: string;
  setEditText: (s: string) => void;
  startEdit: () => void;
  cancelEdit: () => void;
  submitEdit: () => void;
  switchBranch: (delta: 1 | -1) => void;
}) {
  const isUser = message.role === "user";
  const branchCount = message.branches?.length ?? 0;
  const branchIndex = message.branchIndex ?? (branchCount - 1);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div className={cn("group max-w-[88%] rounded-2xl px-3.5 py-2 text-sm", isUser ? "bg-secondary" : "bg-transparent")}>
        {editing && isUser ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={submitEdit} disabled={!editText.trim()}>
                <RefreshCw className="mr-1 h-3 w-3" /> Send
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content || (streaming ? "" : isUser ? "" : "…")}
            {streaming && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-current align-middle" />}
          </p>
        )}
      </div>

      {/* User-message tools row */}
      {isUser && !editing && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {branchCount > 1 && (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded p-1 hover:bg-secondary"
                onClick={() => switchBranch(-1)}
                disabled={branchIndex <= 0}
                aria-label="Previous branch"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="tabular-nums">{branchIndex + 1} / {branchCount}</span>
              <button
                type="button"
                className="rounded p-1 hover:bg-secondary"
                onClick={() => switchBranch(1)}
                disabled={branchIndex >= branchCount - 1}
                aria-label="Next branch"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button type="button" className="rounded p-1 hover:bg-secondary" onClick={startEdit} aria-label="Edit message">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Assistant-message tools row */}
      {!isUser && !streaming && message.content && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" className="rounded p-1 hover:bg-secondary" onClick={onCopy} aria-label="Copy">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
