"use client";

import { FormEvent, useMemo, useState } from "react";
import type { MessageWithMeta } from "@/hooks/spacetime/useMessages";

type MessageItemProps = {
  message: MessageWithMeta;
  authorLabel: string;
  threadReplyCount?: number;
  enableReply?: boolean;
  onReply: (messageId: string) => void;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onAddReaction: (messageId: string, emoji: string) => Promise<void>;
  onRemoveReaction: (messageId: string, emoji: string) => Promise<void>;
};

export function MessageItem({
  message,
  authorLabel,
  threadReplyCount = 0,
  enableReply = true,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [emoji, setEmoji] = useState("👍");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeleted = Boolean(message.deletedAt);
  const timestampLabel = useMemo(() => {
    const base = new Date(message.createdAt).toLocaleString();
    if (!message.editedAt) return base;
    return `${base} (edited)`;
  }, [message.createdAt, message.editedAt]);

  async function onSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextContent = draft.trim();
    if (!nextContent) {
      setError("Message cannot be empty.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await onEditMessage(message.id, nextContent);
      setIsEditing(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to edit message.");
    } finally {
      setIsBusy(false);
    }
  }

  async function onDelete() {
    setIsBusy(true);
    setError(null);
    try {
      await onDeleteMessage(message.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete message.");
    } finally {
      setIsBusy(false);
    }
  }

  async function onReactAdd() {
    const value = emoji.trim();
    if (!value) return;
    setIsBusy(true);
    setError(null);
    try {
      await onAddReaction(message.id, value);
      setEmoji(value);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to add reaction.");
    } finally {
      setIsBusy(false);
    }
  }

  async function onReactRemove() {
    const value = emoji.trim();
    if (!value) return;
    setIsBusy(true);
    setError(null);
    try {
      await onRemoveReaction(message.id, value);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to remove reaction.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <header className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-100">{authorLabel}</p>
        <p className="text-xs text-slate-400">{timestampLabel}</p>
        {message.threadParentId ? (
          <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] uppercase text-slate-400">
            Thread Reply
          </span>
        ) : null}
      </header>

      {isEditing && !isDeleted ? (
        <form onSubmit={onSubmitEdit} className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraft(message.content);
                setError(null);
              }}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-100">{isDeleted ? "This message was deleted." : message.content}</p>
      )}

      {message.attachments.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-slate-800 bg-slate-900/60 p-2">
          {message.attachments.map((attachment) => (
            <li key={attachment.id}>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-300 hover:text-sky-200"
              >
                {attachment.filename} ({Math.round(attachment.sizeBytes / 1024)} KB)
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {message.reactions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {message.reactions.map((reaction) => (
            <span
              key={`${message.id}-${reaction.emoji}`}
              className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-200"
              title={reaction.userIds.join(", ")}
            >
              {reaction.emoji} {reaction.count}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2">
        {enableReply ? (
          <button
            type="button"
            onClick={() => onReply(message.id)}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            disabled={isDeleted}
          >
            Reply
            {threadReplyCount > 0 ? ` (${threadReplyCount})` : ""}
          </button>
        ) : null}

        {!isDeleted ? (
          <button
            type="button"
            onClick={() => setIsEditing((previous) => !previous)}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            {isEditing ? "Close Editor" : "Edit"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy || isDeleted}
          className="rounded-md border border-rose-800/70 px-2 py-1 text-xs text-rose-200 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete
        </button>

        <input
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
          maxLength={64}
          className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
          aria-label="Reaction emoji"
        />

        <button
          type="button"
          onClick={onReactAdd}
          disabled={isBusy || isDeleted}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Reaction
        </button>

        <button
          type="button"
          onClick={onReactRemove}
          disabled={isBusy}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove Reaction
        </button>
      </footer>

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </article>
  );
}
