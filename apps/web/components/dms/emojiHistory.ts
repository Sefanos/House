"use client";

import { DM_EMOJI_PRESETS } from "./dmPresets";

export type EmojiUsageMap = Record<string, number>;

function emojiStorageKey(userId?: string) {
  return `houseplan.dm.emoji-history.${userId ?? "guest"}`;
}

export function readEmojiUsage(userId?: string): EmojiUsageMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(emojiStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as EmojiUsageMap;
  } catch {
    return {};
  }
}

export function writeEmojiUsage(userId: string | undefined, usage: EmojiUsageMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(emojiStorageKey(userId), JSON.stringify(usage));
}

export function incrementEmojiUsage(usage: EmojiUsageMap, emoji: string): EmojiUsageMap {
  const normalized = emoji.trim();
  if (!normalized) {
    return usage;
  }

  return {
    ...usage,
    [normalized]: (usage[normalized] ?? 0) + 1
  };
}

export function rememberEmojiUsage(
  userId: string | undefined,
  usage: EmojiUsageMap,
  emoji: string
): EmojiUsageMap {
  const next = incrementEmojiUsage(usage, emoji);
  writeEmojiUsage(userId, next);
  return next;
}

export function getFrequentEmojis(usage: EmojiUsageMap, limit: number): string[] {
  const ranked = Object.entries(usage)
    .sort((left, right) => right[1] - left[1])
    .map(([emoji]) => emoji)
    .filter(Boolean);

  if (ranked.length > 0) {
    return ranked.slice(0, limit);
  }

  return Array.from(DM_EMOJI_PRESETS).slice(0, limit);
}
