"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addMemory, updateMemory, deleteMemory, clearMemories } from "@/server/actions/memories";
import type { AIMemory } from "@/types/database";

export function MemoryModal({ memories, trigger }: { memories: AIMemory[]; trigger: React.ReactNode }) {
  const [list, setList] = useState(memories);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const onAdd = () => {
    const text = draft.trim();
    if (!text) return;
    start(async () => {
      const res = await addMemory(text);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      // Refetch from server so we get a real id.
      const optimistic: AIMemory = {
        id: `temp-${crypto.randomUUID()}`,
        user_id: "",
        content: text,
        created_at: new Date().toISOString(),
      };
      setList((xs) => [optimistic, ...xs]);
      setDraft("");
      router.refresh();
    });
  };

  const onSaveEdit = (id: string) => {
    const text = editText.trim();
    if (!text) return;
    start(async () => {
      const res = await updateMemory(id, text);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      setList((xs) => xs.map((m) => (m.id === id ? { ...m, content: text } : m)));
      setEditing(null);
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    start(async () => {
      const res = await deleteMemory(id);
      if ("error" in res && res.error) { toast.error(res.error); return; }
      setList((xs) => xs.filter((m) => m.id !== id));
      router.refresh();
    });
  };

  const onClearAll = () => {
    if (!confirm("Delete all AI memories? This cannot be undone.")) return;
    start(async () => {
      const res = await clearMemories();
      if ("error" in res && res.error) { toast.error(res.error); return; }
      setList([]);
      router.refresh();
    });
  };

  return (
    <Modal>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>AI memories</ModalTitle>
          <ModalDescription>
            Facts your assistant remembers about you. {list.length} {list.length === 1 ? "item" : "items"}.
          </ModalDescription>
        </ModalHeader>

        <div className="mt-2 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a memory (e.g. 'allergic to peanuts')"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
            />
            <Button onClick={onAdd} disabled={pending || !draft.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            {list.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No memories yet. Add one above, or tell the assistant to remember something.
              </p>
            ) : (
              <ul className="divide-y">
                <AnimatePresence initial={false}>
                  {list.map((m) => (
                    <motion.li
                      key={m.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-start justify-between gap-2 px-3 py-2"
                    >
                      {editing === m.id ? (
                        <>
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            className="flex-1 text-sm"
                          />
                          <div className="flex shrink-0 gap-1">
                            <Button size="icon" variant="ghost" onClick={() => onSaveEdit(m.id)} disabled={pending} aria-label="Save">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="flex-1 text-sm leading-relaxed">{m.content}</p>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={pending}
                              onClick={() => { setEditing(m.id); setEditText(m.content); }}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" disabled={pending} onClick={() => onDelete(m.id)} aria-label="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {list.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onClearAll} disabled={pending}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
