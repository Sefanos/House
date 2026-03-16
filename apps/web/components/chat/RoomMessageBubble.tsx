"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DmEmojiPicker } from "@/components/dms/DmEmojiPicker";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import type { MessageWithMeta } from "@/hooks/spacetime/useMessages";

export type RoomRenderableMessage = MessageWithMeta & {
  clientId?: string;
  isOptimistic?: boolean;
  optimisticState?: "sending" | "failed";
  sendError?: string | null;
};

export type RoomMessageAuthor = {
  name: string;
  username: string;
  avatarUrl?: string | null;
  status: "online" | "idle" | "dnd" | "offline";
};

type RoomMessageBubbleProps = {
  message: RoomRenderableMessage;
  author: RoomMessageAuthor;
  currentUserId?: string;
  threadReplyCount?: number;
  enableThreadButton?: boolean;
  isBusy: boolean;
  quickReactionEmojis: string[];
  onRememberEmoji: (emoji: string) => void;
  onOpenThread?: (messageId: string) => void;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string, reactedByCurrentUser: boolean) => Promise<void>;
};

function extractUrls(content: string) {
  return content.match(/https?:\/\/[^\s]+/g) ?? [];
}

function isMediaUrl(url: string) {
  try {
    const parsed = new URL(url);
    return /\.(gif|png|jpe?g|webp|avif)$/i.test(parsed.pathname);
  } catch {
    return /\.(gif|png|jpe?g|webp|avif)(?:\?.*)?$/i.test(url);
  }
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

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function renderText(content: string, mediaUrls: Set<string>) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (!part) return null;

    if (/^https?:\/\//.test(part)) {
      if (mediaUrls.has(part)) {
        return null;
      }

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

export function RoomMessageBubble({
  message,
  author,
  currentUserId,
  threadReplyCount = 0,
  enableThreadButton = true,
  isBusy,
  quickReactionEmojis,
  onRememberEmoji,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction
}: RoomMessageBubbleProps) {
  const actionPanelRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [localError, setLocalError] = useState<string | null>(null);

  const isMine = currentUserId ? message.authorId === currentUserId : false;
  const deleted = Boolean(message.deletedAt);
  const emojiOnly = isEmojiOnly(message.content);
  const isSending = message.optimisticState === "sending";
  const hasFailed = message.optimisticState === "failed";
  const hideActionPanel = deleted || Boolean(message.isOptimistic);

  const mediaUrls = useMemo(() => extractUrls(message.content).filter((url) => isMediaUrl(url)), [message.content]);
  const mediaUrlSet = useMemo(() => new Set(mediaUrls), [mediaUrls]);
  const textContent = useMemo(() => renderText(message.content, mediaUrlSet), [mediaUrlSet, message.content]);
  const mediaAttachments = useMemo(
    () =>
      message.attachments.filter((attachment) => attachment.mimeType.startsWith("image/") || isMediaUrl(attachment.url)),
    [message.attachments]
  );
  const fileAttachments = useMemo(
    () =>
      message.attachments.filter(
        (attachment) => !attachment.mimeType.startsWith("image/") && !isMediaUrl(attachment.url)
      ),
    [message.attachments]
  );
  const reactions = useMemo(
    () =>
      message.reactions.map((reaction) => ({
        ...reaction,
        reactedByCurrentUser: currentUserId ? reaction.userIds.includes(currentUserId) : false
      })),
    [currentUserId, message.reactions]
  );

  useEffect(() => {
    setDraft(message.content);
  }, [message.content]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (actionPanelRef.current?.contains(event.target as Node)) {
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

  async function handleReaction(emoji: string) {
    const currentReaction = reactions.find((reaction) => reaction.emoji === emoji);

    setLocalError(null);
    try {
      await onToggleReaction(message.id, emoji, currentReaction?.reactedByCurrentUser ?? false);
      if (!(currentReaction?.reactedByCurrentUser ?? false)) {
        onRememberEmoji(emoji);
      }
      setShowReactionPicker(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to update reaction.");
    }
  }

  async function handleDelete() {
    setLocalError(null);
    try {
      await onDeleteMessage(message.id);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to delete message.");
    }
  }

  return (
    <article
      className={`group relative rounded-[28px] border px-4 py-3 transition ${
        isSending || hasFailed
          ? "border-slate-700 bg-slate-900/55 opacity-70"
          : isMine
            ? "border-rose-400/10 bg-rose-500/[0.06] hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
            : "border-transparent bg-white/[0.015] hover:border-slate-800/90 hover:bg-slate-900/45"
      }`}
    >
      {!hideActionPanel ? (
        <div className="absolute right-4 top-3 z-10 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <div
            ref={actionPanelRef}
            className="relative flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-950/95 p-1.5 shadow-xl shadow-black/30 backdrop-blur"
          >
            {quickReactionEmojis.map((emoji) => (
              <button
                key={`${message.id}-quick-${emoji}`}
                type="button"
                onClick={() => void handleReaction(emoji)}
                disabled={isBusy}
                className="grid h-8 w-8 place-items-center rounded-full text-base transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowReactionPicker((value) => !value)}
              className="grid h-8 w-8 place-items-center rounded-full border border-slate-700 bg-slate-900 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-slate-800"
              title="More reactions"
            >
              +
            </button>

            {enableThreadButton && onOpenThread ? (
              <button
                type="button"
                onClick={() => onOpenThread(message.id)}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
              >
                Reply
              </button>
            ) : null}

            {isMine ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditing((value) => !value);
                  setLocalError(null);
                }}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
              >
                {isEditing ? "Close" : "Edit"}
              </button>
            ) : null}

            {isMine ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isBusy}
                className="rounded-full border border-rose-900/80 bg-rose-950/20 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}

            {showReactionPicker ? (
              <div className="absolute right-0 top-12 z-20 w-[22rem]">
                <DmEmojiPicker
                  height={420}
                  searchPlaceholder="Search every emoji and react"
                  onSelect={(emoji) => void handleReaction(emoji)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <UserAvatar
          username={author.username}
          displayName={author.name}
          avatarUrl={author.avatarUrl}
          status={author.status}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-slate-100">{author.name}</p>
            <p className="text-xs text-slate-500">@{author.username}</p>
            <p className="text-xs text-slate-500">{formatTimestamp(message.createdAt)}</p>
            {message.editedAt ? <span className="text-[11px] text-slate-600">edited</span> : null}
            {isSending ? (
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Sending
              </span>
            ) : null}
            {hasFailed ? (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-rose-200">
                Failed
              </span>
            ) : null}
            {message.threadParentId ? (
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Thread reply
              </span>
            ) : null}
          </div>

          <div className="mt-1">
            {deleted ? (
              <p className="text-sm italic text-slate-500">This message was deleted.</p>
            ) : isEditing ? (
              <div className="space-y-2 rounded-[24px] border border-slate-800 bg-slate-950/80 p-3">
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
                {message.content && textContent.some(Boolean) ? (
                  <div
                    className={`leading-relaxed ${
                      isSending || hasFailed ? "text-slate-300" : "text-slate-100"
                    } ${
                      emojiOnly ? "text-3xl sm:text-4xl" : "text-[15px]"
                    }`}
                  >
                    {textContent}
                  </div>
                ) : null}

                {mediaUrls.length > 0 ? (
                  <div className="grid gap-2 sm:max-w-2xl sm:grid-cols-2">
                    {mediaUrls.map((url) => (
                      <a
                        key={`${message.id}-inline-${url}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70"
                      >
                        <img src={url} alt="Shared media preview" className="max-h-[20rem] w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}

                {mediaAttachments.length > 0 ? (
                  <div className="grid gap-2 sm:max-w-2xl sm:grid-cols-2">
                    {mediaAttachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.filename}
                          className="max-h-[20rem] w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}

                {fileAttachments.length > 0 ? (
                  <div className="grid gap-2 sm:max-w-2xl sm:grid-cols-2">
                    {fileAttachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[24px] border border-slate-800 bg-slate-950/85 px-4 py-3 transition hover:border-slate-700 hover:bg-slate-900"
                      >
                        <p className="truncate text-sm font-medium text-slate-100">{attachment.filename}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {attachment.mimeType || "Attachment"} • {formatAttachmentSize(attachment.sizeBytes)}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {reactions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {reactions.map((reaction) => (
                <button
                  key={`${message.id}-reaction-${reaction.emoji}`}
                  type="button"
                  onClick={() => void handleReaction(reaction.emoji)}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    reaction.reactedByCurrentUser
                      ? "border-sky-400/35 bg-sky-500/12 text-sky-100"
                      : "border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-900"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-xs text-slate-300">{reaction.count}</span>
                </button>
              ))}
            </div>
          ) : null}

          {enableThreadButton || threadReplyCount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {enableThreadButton && onOpenThread ? (
                <button
                  type="button"
                  onClick={() => onOpenThread(message.id)}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
                >
                  {threadReplyCount > 0 ? "Open thread" : "Start thread"}
                </button>
              ) : null}
              {threadReplyCount > 0 ? (
                <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400">
                  {threadReplyCount} {threadReplyCount === 1 ? "reply" : "replies"}
                </span>
              ) : null}
            </div>
          ) : null}

          {localError ? <p className="mt-3 text-xs text-rose-400">{localError}</p> : null}
          {message.sendError ? <p className="mt-3 text-xs text-rose-300">{message.sendError}</p> : null}
        </div>
      </div>
    </article>
  );
}
