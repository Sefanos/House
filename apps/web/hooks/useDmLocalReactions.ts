"use client";

import { useEffect, useMemo, useState } from "react";

export type DmLocalReactionGroup = {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByCurrentUser: boolean;
};

type DmReactionStore = Record<string, string[]>;

function reactionStorageKey(conversationKey?: string, currentUserId?: string) {
  if (!conversationKey) return "";
  return `houseplan.dm.reactions.${currentUserId ?? "guest"}.${conversationKey}`;
}

function readStoredReactions(conversationKey?: string, currentUserId?: string): DmReactionStore {
  if (typeof window === "undefined") return {};

  const storageKey = reactionStorageKey(conversationKey, currentUserId);
  if (!storageKey) return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as DmReactionStore;
  } catch {
    return {};
  }
}

function writeStoredReactions(
  conversationKey: string | undefined,
  currentUserId: string | undefined,
  store: DmReactionStore
) {
  if (typeof window === "undefined") return;

  const storageKey = reactionStorageKey(conversationKey, currentUserId);
  if (!storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(store));
}

export function useDmLocalReactions(conversationKey?: string, currentUserId?: string) {
  const [reactionStore, setReactionStore] = useState<DmReactionStore>({});

  useEffect(() => {
    setReactionStore(readStoredReactions(conversationKey, currentUserId));
  }, [conversationKey, currentUserId]);

  const reactionsByMessage = useMemo(() => {
    const next: Record<string, DmLocalReactionGroup[]> = {};

    for (const [messageId, emojis] of Object.entries(reactionStore)) {
      next[messageId] = emojis.map((emoji) => ({
        emoji,
        count: 1,
        userIds: currentUserId ? [currentUserId] : [],
        reactedByCurrentUser: true
      }));
    }

    return next;
  }, [currentUserId, reactionStore]);

  function toggleReaction(messageId: string, emoji: string) {
    const normalized = emoji.trim();
    if (!normalized) {
      return false;
    }

    let added = false;

    setReactionStore((current) => {
      const existing = current[messageId] ?? [];
      const hasEmoji = existing.includes(normalized);
      added = !hasEmoji;

      const nextEmojis = hasEmoji ? existing.filter((entry) => entry !== normalized) : [...existing, normalized];
      const nextStore =
        nextEmojis.length > 0
          ? {
              ...current,
              [messageId]: nextEmojis
            }
          : Object.fromEntries(Object.entries(current).filter(([entryId]) => entryId !== messageId));

      writeStoredReactions(conversationKey, currentUserId, nextStore);
      return nextStore;
    });

    return added;
  }

  return {
    reactionsByMessage,
    toggleReaction
  };
}
