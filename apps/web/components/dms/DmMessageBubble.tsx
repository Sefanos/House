"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DmEmojiPicker } from "@/components/dms/DmEmojiPicker";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import type { DmLocalReactionGroup } from "@/hooks/useDmLocalReactions";

type DmMessage = {
  id: string;
  fromUserId: string;
  content: string;
  editedAt: string;
  deletedAt: string;
  createdAt: string;
};

type DmMessageBubbleProps = {
  message: DmMessage;
  isMine: boolean;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl?: string | null;
  authorStatus: "online" | "idle" | "dnd" | "offline";
  reactions: DmLocalReactionGroup[];
  quickReactionEmojis: string[];
  isBusy: boolean;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => boolean;
  onRememberEmoji: (emoji: string) => void;
};

function extractUrls(content: string) {
  return content.match(/https?:\/\/[^\s]+/g) ?? [];
}

function isMediaUrl(url: string) {
  return /\.(gif|png|jpe?g|webp)$/i.test(url);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short"
  }).format(new Date(value));
}

function isEmojiOnly(content: string) {
  const normalized = content.trim();
  if (!normalized) return false;
  return /^[\p{Extended_Pictographic}\uFE0F\s]+$/u.test(normalized);
}

function renderText(content: string) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sky-300 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-200"
        >
          {part}
        </a>
      );
    }

    return (
      <span key={`${part}-${index}`} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

export function DmMessageBubble({
  message,
  isMine,
  authorName,
  authorUsername,
  authorAvatarUrl,
  authorStatus,
  reactions,
  quickReactionEmojis,
  isBusy,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onRememberEmoji
}: DmMessageBubbleProps) {
  const reactionPanelRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [localError, setLocalError] = useState<string | null>(null);

  const mediaUrls = useMemo(
    () => extractUrls(message.content).filter((url) => isMediaUrl(url)),
    [message.content]
  );
  const deleted = Boolean(message.deletedAt);
  const emojiOnly = isEmojiOnly(message.content);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (reactionPanelRef.current?.contains(event.target as Node)) {
        return;
      }
      setShowReactionPicker(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function submitEdit() {
    const next = draft.trim();
    if (!next) {
      setLocalError("Message cannot be empty.");
      return;
    }

    setLocalError(null);
    try {
      await onEditMessage(message.id, next);
      setIsEditing(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to save message.");
    }
  }

  function handleReaction(emoji: string) {
    const added = onToggleReaction(message.id, emoji);
    if (added) {
      onRememberEmoji(emoji);
    }
    setShowReactionPicker(false);
  }

  return (
    <article className={`group flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
      {!isMine ? (
        <UserAvatar
          username={authorUsername}
          displayName={authorName}
          avatarUrl={authorAvatarUrl}
          status={authorStatus}
          size="sm"
        />
      ) : null}

      <div className={`max-w-[min(42rem,88%)] ${isMine ? "order-first" : ""}`}>
        <div className={`mb-1 flex items-center gap-2 ${isMine ? "justify-end" : ""}`}>
          {!isMine ? <p className="text-sm font-semibold text-slate-100">{authorName}</p> : null}
          <p className="text-xs text-slate-500">{formatTimestamp(message.createdAt)}</p>
          {message.editedAt ? <span className="text-[11px] text-slate-600">edited</span> : null}
        </div>

        {!deleted ? (
          <div
            className={`mb-2 flex ${isMine ? "justify-end" : "justify-start"} opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100`}
          >
            <div
              ref={reactionPanelRef}
              className="relative flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-950/95 p-1.5 shadow-xl shadow-black/30 backdrop-blur"
            >
              {quickReactionEmojis.map((emoji) => (
                <button
                  key={`${message.id}-quick-${emoji}`}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  className="grid h-9 w-9 place-items-center rounded-full text-lg transition hover:bg-slate-800"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowReactionPicker((value) => !value)}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 bg-slate-900 text-base text-slate-200 transition hover:border-rose-400/40 hover:bg-slate-800"
                title="Open emoji picker"
              >
                +
              </button>

              {showReactionPicker ? (
                <div className={`absolute top-12 z-20 w-[22rem] ${isMine ? "right-0" : "left-0"}`}>
                  <DmEmojiPicker
                    height={420}
                    searchPlaceholder="Search every emoji and react"
                    onSelect={handleReaction}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={`rounded-[24px] border px-4 py-3 shadow-lg shadow-black/15 ${
            isMine
              ? "border-rose-400/25 bg-[linear-gradient(145deg,rgba(190,24,93,0.22),rgba(15,23,42,0.96))]"
              : "border-slate-800 bg-slate-900/92"
          }`}
        >
          {deleted ? (
            <p className="text-sm italic text-slate-500">This message was deleted.</p>
          ) : isEditing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                rows={3}
                maxLength={2000}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitEdit()}
                  disabled={isBusy}
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setIsEditing(false);
                    setLocalError(null);
                  }}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={`leading-relaxed text-slate-100 ${
                  emojiOnly ? "text-3xl sm:text-4xl" : "text-[15px]"
                }`}
              >
                {renderText(message.content)}
              </div>

              {mediaUrls.length > 0 ? (
                <div className="grid gap-2">
                  {mediaUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70"
                    >
                      <img src={url} alt="GIF preview" className="max-h-[24rem] w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {reactions.length > 0 ? (
          <div className={`mt-3 flex flex-wrap gap-2 ${isMine ? "justify-end" : ""}`}>
            {reactions.map((reaction) => (
              <button
                key={`${message.id}-reaction-${reaction.emoji}`}
                type="button"
                onClick={() => handleReaction(reaction.emoji)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                  reaction.reactedByCurrentUser
                    ? "border-rose-400/35 bg-rose-500/12 text-rose-100"
                    : "border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-900"
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs text-slate-300">{reaction.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!deleted && isMine ? (
          <div className="mt-2 flex justify-end gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => {
                setIsEditing((value) => !value);
                setLocalError(null);
              }}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              {isEditing ? "Close" : "Edit"}
            </button>
            <button
              type="button"
              onClick={() => void onDeleteMessage(message.id)}
              disabled={isBusy}
              className="rounded-xl border border-rose-900/70 bg-rose-950/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Delete
            </button>
          </div>
        ) : null}

        {localError ? <p className="mt-2 text-xs text-rose-400">{localError}</p> : null}
      </div>

      {isMine ? (
        <UserAvatar
          username={authorUsername}
          displayName={authorName}
          avatarUrl={authorAvatarUrl}
          status={authorStatus}
          size="sm"
        />
      ) : null}
    </article>
  );
}
