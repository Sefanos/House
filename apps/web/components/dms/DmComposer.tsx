"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { GifPicker } from "@/components/gifs/GifPicker";
import { DmEmojiPicker } from "./DmEmojiPicker";
import type { EmojiUsageMap } from "./emojiHistory";
import { getFrequentEmojis } from "./emojiHistory";

type DmComposerProps = {
  recipientLabel: string;
  isSending: boolean;
  emojiUsage: EmojiUsageMap;
  onRememberEmoji: (emoji: string) => void;
  onSendMessage: (content: string) => Promise<void>;
};

const RECENT_EMOJI_LIMIT = 12;

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.9]">
      <path d="M4 11.5 20 4l-4.8 16-3.3-5.2L4 11.5Z" strokeLinejoin="round" />
      <path d="M11.7 14.7 20 4" strokeLinecap="round" />
    </svg>
  );
}

export function DmComposer({
  recipientLabel,
  isSending,
  emojiUsage,
  onRememberEmoji,
  onSendMessage
}: DmComposerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !isSending, [draft, isSending]);

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

  const frequentEmojis = useMemo(() => {
    return getFrequentEmojis(emojiUsage, RECENT_EMOJI_LIMIT);
  }, [emojiUsage]);

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
      setLocalError(error instanceof Error ? error.message : "Failed to send DM.");
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
      className="sticky bottom-0 z-10 rounded-[28px] border border-slate-800 bg-slate-950/95 p-3 shadow-2xl shadow-black/20 backdrop-blur"
    >
      <div ref={panelRef} className="relative">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 px-1 pb-3">
          <button
            type="button"
            onMouseEnter={() => {
              setShowEmojiPicker(true);
              setShowGifPicker(false);
            }}
            onClick={() => {
              setShowEmojiPicker((value) => !value);
              setShowGifPicker(false);
            }}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Emoji
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGifPicker((value) => !value);
              setShowEmojiPicker(false);
            }}
            className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            GIF
          </button>
          <p className="ml-auto text-xs text-slate-500">Enter to send, Shift+Enter for a new line</p>
        </div>

        {showEmojiPicker ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/88 p-3 shadow-xl shadow-black/20">
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Most used</p>
              <div className="flex flex-wrap gap-2">
                {frequentEmojis.map((emoji) => (
                  <button
                    key={`recent-${emoji}`}
                    type="button"
                    onClick={() => insertText(emoji, true)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xl hover:bg-slate-800"
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
          <GifPicker isSending={isSending} tone="rose" onSelect={submitContent} />
        ) : null}
      </div>

      <div className="mt-3">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800/90 bg-[linear-gradient(180deg,rgba(30,41,59,0.95),rgba(15,23,42,0.98))] shadow-[inset_0_1px_0_rgba(148,163,184,0.08)] transition focus-within:border-rose-400/35 focus-within:shadow-[0_0_0_1px_rgba(244,63,94,0.14)]">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={2000}
            placeholder={`Message ${recipientLabel}`}
            className="min-h-[76px] w-full resize-none bg-transparent px-4 py-4 pr-20 text-[15px] text-slate-100 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={isSending ? "Sending direct message" : "Send direct message"}
            className="absolute right-3 top-3 inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fb7185,#f43f5e)] px-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:scale-[1.02] hover:shadow-rose-500/30 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-60"
          >
            <span className="hidden pr-2 sm:inline">{isSending ? "..." : "Send"}</span>
            <SendIcon />
          </button>
        </div>
      </div>

      {localError ? <p className="mt-3 text-sm text-rose-400">{localError}</p> : null}
    </form>
  );
}
