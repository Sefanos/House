"use client";

import { useMemo } from "react";
import { RoomMessageBubble, type RoomMessageAuthor, type RoomRenderableMessage } from "./RoomMessageBubble";

type MessageListProps = {
  messages: RoomRenderableMessage[];
  authorsById: Map<string, RoomMessageAuthor>;
  currentUserId?: string;
  isBusy: boolean;
  quickReactionEmojis: string[];
  onRememberEmoji: (emoji: string) => void;
  onOpenThread: (messageId: string) => void;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string, reactedByCurrentUser: boolean) => Promise<void>;
};

function formatDayDivider(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

export function MessageList({
  messages,
  authorsById,
  currentUserId,
  isBusy,
  quickReactionEmojis,
  onRememberEmoji,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction
}: MessageListProps) {
  const rootMessages = useMemo(
    () => messages.filter((message) => !message.threadParentId),
    [messages]
  );

  const threadReplyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of messages) {
      if (!message.threadParentId) continue;
      counts.set(message.threadParentId, (counts.get(message.threadParentId) ?? 0) + 1);
    }
    return counts;
  }, [messages]);

  const entries = useMemo(() => {
    const items: Array<
      | { kind: "divider"; id: string; label: string }
      | { kind: "message"; id: string; message: RoomRenderableMessage }
    > = [];

    let previousDay = "";
    for (const message of rootMessages) {
      const nextDay = message.createdAt.slice(0, 10);
      if (nextDay !== previousDay) {
        items.push({
          kind: "divider",
          id: `divider-${nextDay}`,
          label: formatDayDivider(message.createdAt)
        });
        previousDay = nextDay;
      }
      items.push({
        kind: "message",
        id: message.id,
        message
      });
    }

    return items;
  }, [rootMessages]);

  if (rootMessages.length === 0) {
    return (
      <section className="grid gap-3 rounded-[28px] border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-slate-800 bg-slate-900/70 text-3xl text-sky-300">
          #
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-100">This room is quiet for now</h3>
          <p className="mt-2 text-sm text-slate-400">
            Drop the first message, share a GIF, or open a thread to kick things off.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {entries.map((entry) => {
        if (entry.kind === "divider") {
          return (
            <div key={entry.id} className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-slate-800" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{entry.label}</p>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
          );
        }

        const message = entry.message;
        const author = authorsById.get(message.authorId) ?? {
          name: message.authorId,
          username: message.authorId,
          avatarUrl: "",
          status: "offline" as const
        };

        return (
          <RoomMessageBubble
            key={entry.id}
            message={message}
            author={author}
            currentUserId={currentUserId}
            threadReplyCount={threadReplyCounts.get(message.id) ?? 0}
            isBusy={isBusy}
            quickReactionEmojis={quickReactionEmojis}
            onRememberEmoji={onRememberEmoji}
            onOpenThread={onOpenThread}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onToggleReaction={onToggleReaction}
          />
        );
      })}
    </section>
  );
}
