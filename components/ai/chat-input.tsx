"use client";

import { useRef, useState } from "react";
import { Mic, Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function ChatInput({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (content: string, attachment?: { name: string; data: string }) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const submit = () => {
    const text = value.trim();
    if (!text && !attachment) return;
    onSend(text, attachment ?? undefined);
    setValue("");
    setAttachment(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const pickFile = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: f.name, data: String(reader.result) });
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) { toast.error("Speech recognition not supported"); return; }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setValue((v) => (v ? v + " " + text : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <div className="flex items-end gap-1.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <Button type="button" size="icon" variant="ghost" onClick={pickFile} disabled={disabled}>
        <Paperclip className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        {attachment && (
          <p className="mb-1 truncate text-[11px] text-muted-foreground">📎 {attachment.name}</p>
        )}
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything…"
          rows={1}
          className="min-h-[40px] max-h-40 resize-none"
          disabled={disabled}
        />
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={toggleMic} disabled={disabled}>
        {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button type="button" size="icon" onClick={submit} disabled={disabled}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
