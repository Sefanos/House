"use client";

import { useEffect, useMemo, useRef } from "react";
import { getFrequentEmojis, type EmojiUsageMap } from "@/components/dms/emojiHistory";
import { RoomComposer } from "./RoomComposer";
import { RoomMessageBubble, type RoomMessageAuthor, type RoomRenderableMessage } from "./RoomMessageBubble";

type ThreadPanelProps = {
  roomName: string;
  parentMessage: RoomRenderableMessage | null;
  threadMessages: RoomRenderableMessage[];
  authorsById: Map<string, RoomMessageAuthor>;
  currentUserId?: string;
  isSending: boolean;
  isBusy: boolean;
  emojiUsage: EmojiUsageMap;
  onClose: () => void;
  onRememberEmoji: (emoji: string) => void;
  onSendMessage: (content: string, threadParentId?: string) => Promise<void>;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string, reactedByCurrentUser: boolean) => Promise<void>;
};

export function ThreadPanel({
  roomName,
  parentMessage,
  threadMessages,
  authorsById,
  currentUserId,
  isSending,
  isBusy,
  emojiUsage,
  onClose,
  onRememberEmoji,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction
}: ThreadPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quickReactionEmojis = useMemo(() => getFrequentEmojis(emojiUsage, 4), [emojiUsage]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [parentMessage?.id, threadMessages.length]);

  if (!parentMessage) {
    return (
      <aside className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
        <p className="text-sm text-slate-300">Select a message and click Reply to open a thread.</p>
      </aside>
    );
  }

  const parentAuthor = authorsById.get(parentMessage.authorId) ?? {
    name: parentMessage.authorId,
    username: parentMessage.authorId,
    avatarUrl: "",
    status: "offline" as const
  };

  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.96))]">
      <header className="border-b border-slate-800 bg-slate-950/70 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Thread</p>
            <h5 className="mt-1 text-base font-semibold text-slate-100">Reply side chat</h5>
            <p className="mt-1 text-sm text-slate-400">Keep #{roomName} tidy while the thread stays focused.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <RoomMessageBubble
            message={parentMessage}
            author={parentAuthor}
            currentUserId={currentUserId}
            threadReplyCount={threadMessages.length}
            enableThreadButton={false}
            isBusy={isBusy}
            quickReactionEmojis={quickReactionEmojis}
            onRememberEmoji={onRememberEmoji}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onToggleReaction={onToggleReaction}
          />

          <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {threadMessages.length === 0 ? "No replies yet" : `${threadMessages.length} replies`}
            </p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {threadMessages.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-950/40 p-5 text-sm text-slate-400">
              Reply here to split side conversations out of the main room.
            </div>
          ) : (
            <div className="space-y-3">
              {threadMessages.map((message) => {
                const author = authorsById.get(message.authorId) ?? {
                  name: message.authorId,
                  username: message.authorId,
                  avatarUrl: "",
                  status: "offline" as const
                };

                return (
                  <RoomMessageBubble
                    key={message.id}
                    message={message}
                    author={author}
                    currentUserId={currentUserId}
                    enableThreadButton={false}
                    isBusy={isBusy}
                    quickReactionEmojis={quickReactionEmojis}
                    onRememberEmoji={onRememberEmoji}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={onDeleteMessage}
                    onToggleReaction={onToggleReaction}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800/70 px-4 py-4">
        <RoomComposer
          roomLabel={roomName}
          isSending={isSending}
          emojiUsage={emojiUsage}
          threadLabel={parentAuthor.name}
          placeholder={`Reply in #${roomName}`}
          onCancelThread={onClose}
          onRememberEmoji={onRememberEmoji}
          onSendMessage={(content) => onSendMessage(content, parentMessage.id)}
        />
      </div>
    </aside>
  );
}
