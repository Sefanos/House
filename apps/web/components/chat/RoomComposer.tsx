"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { DmEmojiPicker } from "@/components/dms/DmEmojiPicker";
import { GifPicker } from "@/components/gifs/GifPicker";
import type { EmojiUsageMap } from "@/components/dms/emojiHistory";
import { getFrequentEmojis } from "@/components/dms/emojiHistory";

type RoomComposerProps = {
  roomLabel: string;
  isSending: boolean;
  emojiUsage: EmojiUsageMap;
  threadLabel?: string;
  placeholder?: string;
  onCancelThread?: () => void;
  onRememberEmoji: (emoji: string) => void;
  onSendMessage: (content: string) => Promise<void>;
};

const RECENT_EMOJI_LIMIT = 12;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.9]">
      <path d="M4 11.5 20 4l-4.8 16-3.3-5.2L4 11.5Z" strokeLinejoin="round" />
      <path d="M11.7 14.7 20 4" strokeLinecap="round" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5c.8 1.1 2.03 1.75 3.5 1.75s2.7-.65 3.5-1.75" strokeLinecap="round" />
      <circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RoomComposer({
  roomLabel,
  isSending,
  emojiUsage,
  threadLabel,
  placeholder,
  onCancelThread,
  onRememberEmoji,
  onSendMessage
}: RoomComposerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !isSending, [draft, isSending]);
  const frequentEmojis = useMemo(() => getFrequentEmojis(emojiUsage, RECENT_EMOJI_LIMIT), [emojiUsage]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (panelRef.current?.contains(event.target as Node)) {
        return;
      }
      setShowEmojiPicker(false);
      setShowGifPicker(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  function insertText(next: string, remember = false) {
    setDraft((current) => {
      if (!current.trim()) return next;
      return `${current}${current.endsWith(" ") || current.endsWith("\n") ? "" : " "}${next}`;
    });

    if (remember) {
      onRememberEmoji(next);
    }
  }

  async function submitContent(content: string) {
    const normalized = content.trim();
    if (!normalized) return;

    setLocalError(null);
    try {
      await onSendMessage(normalized);
      setDraft("");
      setShowEmojiPicker(false);
      setShowGifPicker(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to send message.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitContent(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void submitContent(draft);
      }
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 z-10 rounded-[24px] border border-slate-800 bg-slate-950/95 p-2.5 shadow-2xl shadow-black/20 backdrop-blur"
    >
      {threadLabel ? (
        <div className="mb-2.5 flex items-center justify-between gap-3 rounded-[20px] border border-sky-500/20 bg-sky-500/10 px-3 py-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Thread reply</p>
            <p className="mt-1 text-sm text-slate-100">Replying to {threadLabel}</p>
          </div>
          {onCancelThread ? (
            <button
              type="button"
              onClick={onCancelThread}
              className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
            >
              Close thread
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={panelRef} className="relative">
        {showEmojiPicker ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-3 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900/96 p-3 shadow-2xl shadow-black/35">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Most used</p>
              <div className="flex flex-wrap gap-2">
                {frequentEmojis.map((emoji) => (
                  <button
                    key={`recent-${emoji}`}
                    type="button"
                    onClick={() => insertText(emoji, true)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xl transition hover:bg-slate-800"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <DmEmojiPicker
                height={420}
                searchPlaceholder="Search emoji, symbols, flags, animals..."
                onSelect={(emoji) => insertText(emoji, true)}
              />
            </div>
          </div>
        ) : null}

        {showGifPicker ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-3">
            <GifPicker isSending={isSending} tone="sky" onSelect={submitContent} />
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-[24px] border border-slate-800/90 bg-[linear-gradient(180deg,rgba(30,41,59,0.95),rgba(15,23,42,0.98))] shadow-[inset_0_1px_0_rgba(148,163,184,0.08)] transition focus-within:border-sky-400/35 focus-within:shadow-[0_0_0_1px_rgba(56,189,248,0.14)]">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={2000}
            placeholder={placeholder ?? `Message #${roomLabel}`}
            className="min-h-[64px] w-full resize-none bg-transparent px-4 py-3 pb-14 pr-24 text-[15px] text-slate-100 outline-none placeholder:text-slate-400"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker((value) => !value);
                setShowGifPicker(false);
              }}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition",
                showEmojiPicker
                  ? "border-sky-400/35 bg-sky-400/12 text-sky-100"
                  : "border-slate-700 bg-slate-900/90 text-slate-300 hover:bg-slate-800"
              )}
            >
              <EmojiIcon />
              Emoji
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGifPicker((value) => !value);
                setShowEmojiPicker(false);
              }}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition",
                showGifPicker
                  ? "border-sky-400/35 bg-sky-400/12 text-sky-100"
                  : "border-slate-700 bg-slate-900/90 text-slate-300 hover:bg-slate-800"
              )}
            >
              GIF
            </button>
          </div>
          <button
            type="submit"
            disabled={!canSend}
            aria-label={isSending ? "Sending message" : "Send message"}
            className="absolute bottom-3 right-3 inline-flex h-9 min-w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60"
          >
            <span className="hidden pr-2 sm:inline">{isSending ? "..." : "Send"}</span>
            <SendIcon />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-slate-500">Enter to send, Shift+Enter for a new line</p>
        <p className="text-xs text-slate-500">{draft.length}/2000</p>
      </div>

      {localError ? <p className="mt-3 text-sm text-rose-400">{localError}</p> : null}
    </form>
  );
}
