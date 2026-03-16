"use client";

import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { EmojiStyle, SuggestionMode, Theme, type EmojiClickData } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false
});

type DmEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  height?: number;
  searchPlaceholder?: string;
};

const pickerStyle = {
  "--epr-bg-color": "rgba(2, 6, 23, 0.96)",
  "--epr-category-label-bg-color": "rgba(15, 23, 42, 0.96)",
  "--epr-text-color": "#e2e8f0",
  "--epr-search-input-bg-color": "rgba(15, 23, 42, 0.9)",
  "--epr-search-input-text-color": "#e2e8f0",
  "--epr-search-border-color": "rgba(51, 65, 85, 0.9)",
  "--epr-hover-bg-color": "rgba(30, 41, 59, 0.92)",
  "--epr-focus-bg-color": "rgba(15, 23, 42, 0.96)",
  "--epr-picker-border-color": "rgba(51, 65, 85, 0.85)",
  "--epr-preview-bg-color": "rgba(15, 23, 42, 0.94)"
} as CSSProperties;

export function DmEmojiPicker({
  onSelect,
  height = 420,
  searchPlaceholder = "Search every emoji"
}: DmEmojiPickerProps) {
  function handleEmojiClick(data: EmojiClickData) {
    onSelect(data.emoji);
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-800/90 shadow-2xl shadow-black/40">
      <EmojiPicker
        theme={Theme.DARK}
        emojiStyle={EmojiStyle.NATIVE}
        searchPlaceholder={searchPlaceholder}
        previewConfig={{ showPreview: false }}
        lazyLoadEmojis
        autoFocusSearch={false}
        suggestedEmojisMode={SuggestionMode.FREQUENT}
        width="100%"
        height={height}
        style={pickerStyle}
        onEmojiClick={handleEmojiClick}
      />
    </div>
  );
}
