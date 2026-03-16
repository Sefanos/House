"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type MessageRow = {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
  editedAt: string;
  deletedAt: string;
  threadParentId: string;
  isPinned: boolean;
  createdAt: string;
};

type AttachmentRow = {
  id: string;
  messageId: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type ReactionRow = {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
};

export type MessageReactionGroup = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type MessageWithMeta = MessageRow & {
  attachments: AttachmentRow[];
  reactions: MessageReactionGroup[];
};

type UseMessagesResult = {
  messages: MessageWithMeta[];
  isLoading: boolean;
  error: string | null;
};

export function useMessages(roomId?: string): UseMessagesResult {
  const [messages, setMessages] = useState<MessageWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roomFilter = useMemo(() => roomId ?? "", [roomId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const messageTable = connection.db.messages;
        const reactionTable = connection.db.reactions;
        const attachmentTable = connection.db.attachments;

        const syncMessages = () => {
          if (disposed) return;

          const messageRows = Array.from(messageTable.iter()) as MessageRow[];
          const filteredMessages = roomFilter
            ? messageRows.filter((message) => message.roomId === roomFilter)
            : messageRows;
          filteredMessages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

          const messageIds = new Set(filteredMessages.map((message) => message.id));

          const reactionRows = (Array.from(reactionTable.iter()) as ReactionRow[]).filter((reaction) =>
            messageIds.has(reaction.messageId)
          );
          const attachmentRows = (Array.from(attachmentTable.iter()) as AttachmentRow[]).filter((attachment) =>
            messageIds.has(attachment.messageId)
          );

          const reactionsByMessage = new Map<string, Map<string, Set<string>>>();
          for (const reaction of reactionRows) {
            const byEmoji = reactionsByMessage.get(reaction.messageId) ?? new Map<string, Set<string>>();
            const userIds = byEmoji.get(reaction.emoji) ?? new Set<string>();
            userIds.add(reaction.userId);
            byEmoji.set(reaction.emoji, userIds);
            reactionsByMessage.set(reaction.messageId, byEmoji);
          }

          const attachmentsByMessage = new Map<string, AttachmentRow[]>();
          for (const attachment of attachmentRows) {
            const items = attachmentsByMessage.get(attachment.messageId) ?? [];
            items.push(attachment);
            attachmentsByMessage.set(attachment.messageId, items);
          }

          for (const items of attachmentsByMessage.values()) {
            items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          }

          const nextMessages: MessageWithMeta[] = filteredMessages.map((message) => {
            const groupedReactions: MessageReactionGroup[] = [];
            const reactionGroups = reactionsByMessage.get(message.id);
            if (reactionGroups) {
              for (const [emoji, userIds] of reactionGroups.entries()) {
                groupedReactions.push({
                  emoji,
                  count: userIds.size,
                  userIds: Array.from(userIds)
                });
              }
              groupedReactions.sort((a, b) => a.emoji.localeCompare(b.emoji));
            }

            return {
              ...message,
              reactions: groupedReactions,
              attachments: attachmentsByMessage.get(message.id) ?? []
            };
          });

          setMessages(nextMessages);
          setIsLoading(false);
        };

        const onInsert = () => syncMessages();
        const onDelete = () => syncMessages();
        const onUpdate = () => syncMessages();

        messageTable.onInsert(onInsert);
        messageTable.onDelete(onDelete);
        messageTable.onUpdate(onUpdate);
        reactionTable.onInsert(onInsert);
        reactionTable.onDelete(onDelete);
        reactionTable.onUpdate(onUpdate);
        attachmentTable.onInsert(onInsert);
        attachmentTable.onDelete(onDelete);
        attachmentTable.onUpdate(onUpdate);

        syncMessages();

        cleanup = () => {
          messageTable.removeOnInsert(onInsert);
          messageTable.removeOnDelete(onDelete);
          messageTable.removeOnUpdate(onUpdate);
          reactionTable.removeOnInsert(onInsert);
          reactionTable.removeOnDelete(onDelete);
          reactionTable.removeOnUpdate(onUpdate);
          attachmentTable.removeOnInsert(onInsert);
          attachmentTable.removeOnDelete(onDelete);
          attachmentTable.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load messages.");
        setIsLoading(false);
      }
    }

    setup();

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [roomFilter]);

  return { messages, isLoading, error };
}
