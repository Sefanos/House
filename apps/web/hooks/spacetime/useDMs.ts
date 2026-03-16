"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type DmMessageRow = {
  id: string;
  conversationKey: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  editedAt: string;
  deletedAt: string;
  createdAt: string;
};

type UseDMsResult = {
  conversationKey: string;
  messages: DmMessageRow[];
  isLoading: boolean;
  error: string | null;
};

export function canonicalConversationKey(firstUserId: string, secondUserId: string): string {
  const ordered = [firstUserId, secondUserId].sort((a, b) => a.localeCompare(b));
  return `${ordered[0]}_${ordered[1]}`;
}

export function useDMs(currentUserId?: string, otherUserId?: string): UseDMsResult {
  const [messages, setMessages] = useState<DmMessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conversationKey = useMemo(() => {
    if (!currentUserId || !otherUserId) return "";
    return canonicalConversationKey(currentUserId, otherUserId);
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.dmMessages;

        const syncMessages = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as DmMessageRow[];
          const nextRows = conversationKey
            ? rows.filter((entry) => entry.conversationKey === conversationKey)
            : [];
          nextRows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          setMessages(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncMessages();
        const onDelete = () => syncMessages();
        const onUpdate = () => syncMessages();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncMessages();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load DMs.");
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
  }, [conversationKey]);

  return {
    conversationKey,
    messages,
    isLoading,
    error
  };
}
