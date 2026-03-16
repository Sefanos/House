"use client";

import {
  BACKGROUND_STYLES,
  DEFAULT_VISUAL_CUSTOMIZATION,
  FONT_FAMILIES,
  RADIUS_SCALES,
  THEME_PRESETS,
  THEME_SOURCES,
  type BackgroundStyle,
  type FontFamily,
  type RadiusScale,
  type ThemePresetId,
  type ThemeSource
} from "@houseplan/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = "houseplan.customization";
const DEFAULT_ACCENT = DEFAULT_VISUAL_CUSTOMIZATION.accentColor;
const DEFAULT_CHAT_SIDEBAR_WIDTH = 320;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function pickValid<T extends string>(value: string, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function sanitizeAccentColor(value: string): string {
  return HEX_COLOR.test(value) ? value : DEFAULT_ACCENT;
}

function sanitizeSidebarWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHAT_SIDEBAR_WIDTH;
  }

  return Math.min(560, Math.max(260, Math.round(value)));
}

type CustomizationState = {
  presetId: ThemePresetId;
  themeSource: ThemeSource;
  accentColor: string;
  backgroundStyle: BackgroundStyle;
  fontFamily: FontFamily;
  radiusScale: RadiusScale;
  voiceBarExpanded: boolean;
  chatSidebarOpen: boolean;
  chatSidebarWidth: number;
  setPresetId: (presetId: ThemePresetId) => void;
  setThemeSource: (themeSource: ThemeSource) => void;
  setAccentColor: (accentColor: string) => void;
  setBackgroundStyle: (backgroundStyle: BackgroundStyle) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setRadiusScale: (radiusScale: RadiusScale) => void;
  setVoiceBarExpanded: (expanded: boolean) => void;
  setChatSidebarOpen: (open: boolean) => void;
  setChatSidebarWidth: (width: number) => void;
  toggleVoiceBarExpanded: () => void;
  toggleChatSidebarOpen: () => void;
  resetCustomization: () => void;
};

const DEFAULT_STATE = {
  presetId: DEFAULT_VISUAL_CUSTOMIZATION.presetId,
  themeSource: DEFAULT_VISUAL_CUSTOMIZATION.themeSource,
  accentColor: DEFAULT_VISUAL_CUSTOMIZATION.accentColor,
  backgroundStyle: DEFAULT_VISUAL_CUSTOMIZATION.backgroundStyle,
  fontFamily: DEFAULT_VISUAL_CUSTOMIZATION.fontFamily,
  radiusScale: DEFAULT_VISUAL_CUSTOMIZATION.radiusScale,
  voiceBarExpanded: false,
  chatSidebarOpen: false,
  chatSidebarWidth: DEFAULT_CHAT_SIDEBAR_WIDTH
};

export const useCustomizationStore = create<CustomizationState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setPresetId: (presetId) =>
        set((state) => (state.presetId === presetId ? state : { presetId })),
      setThemeSource: (themeSource) =>
        set((state) => (state.themeSource === themeSource ? state : { themeSource })),
      setAccentColor: (accentColor) =>
        set((state) => {
          const next = sanitizeAccentColor(accentColor);
          return state.accentColor === next ? state : { accentColor: next };
        }),
      setBackgroundStyle: (backgroundStyle) =>
        set((state) => (state.backgroundStyle === backgroundStyle ? state : { backgroundStyle })),
      setFontFamily: (fontFamily) =>
        set((state) => (state.fontFamily === fontFamily ? state : { fontFamily })),
      setRadiusScale: (radiusScale) =>
        set((state) => (state.radiusScale === radiusScale ? state : { radiusScale })),
      setVoiceBarExpanded: (voiceBarExpanded) =>
        set((state) => (state.voiceBarExpanded === voiceBarExpanded ? state : { voiceBarExpanded })),
      setChatSidebarOpen: (chatSidebarOpen) =>
        set((state) => (state.chatSidebarOpen === chatSidebarOpen ? state : { chatSidebarOpen })),
      setChatSidebarWidth: (chatSidebarWidth) =>
        set((state) => {
          const next = sanitizeSidebarWidth(chatSidebarWidth);
          return state.chatSidebarWidth === next ? state : { chatSidebarWidth: next };
        }),
      toggleVoiceBarExpanded: () => set((state) => ({ voiceBarExpanded: !state.voiceBarExpanded })),
      toggleChatSidebarOpen: () => set((state) => ({ chatSidebarOpen: !state.chatSidebarOpen })),
      resetCustomization: () =>
        set((state) => {
          if (
            state.presetId === DEFAULT_STATE.presetId &&
            state.themeSource === DEFAULT_STATE.themeSource &&
            state.accentColor === DEFAULT_STATE.accentColor &&
            state.backgroundStyle === DEFAULT_STATE.backgroundStyle &&
            state.fontFamily === DEFAULT_STATE.fontFamily &&
            state.radiusScale === DEFAULT_STATE.radiusScale &&
            state.voiceBarExpanded === DEFAULT_STATE.voiceBarExpanded &&
            state.chatSidebarOpen === DEFAULT_STATE.chatSidebarOpen &&
            state.chatSidebarWidth === DEFAULT_STATE.chatSidebarWidth
          ) {
            return state;
          }
          return DEFAULT_STATE;
        })
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const value = (persisted ?? {}) as Partial<CustomizationState>;
        return {
          ...current,
          presetId: pickValid(value.presetId ?? current.presetId, THEME_PRESETS, current.presetId),
          themeSource: pickValid(value.themeSource ?? current.themeSource, THEME_SOURCES, current.themeSource),
          accentColor: sanitizeAccentColor(value.accentColor ?? current.accentColor),
          backgroundStyle: pickValid(
            value.backgroundStyle ?? current.backgroundStyle,
            BACKGROUND_STYLES,
            current.backgroundStyle
          ),
          fontFamily: pickValid(value.fontFamily ?? current.fontFamily, FONT_FAMILIES, current.fontFamily),
          radiusScale: pickValid(value.radiusScale ?? current.radiusScale, RADIUS_SCALES, current.radiusScale),
          voiceBarExpanded: typeof value.voiceBarExpanded === "boolean" ? value.voiceBarExpanded : current.voiceBarExpanded,
          chatSidebarOpen: typeof value.chatSidebarOpen === "boolean" ? value.chatSidebarOpen : current.chatSidebarOpen,
          chatSidebarWidth: sanitizeSidebarWidth(value.chatSidebarWidth ?? current.chatSidebarWidth)
        };
      }
    }
  )
);
