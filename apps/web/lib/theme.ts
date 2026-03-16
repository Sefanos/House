import type {
  BackgroundStyle,
  FontFamily,
  RadiusScale,
  ThemeId,
  ThemePresetId,
  ThemeSource,
  UserVisualCustomization
} from "@houseplan/types";
import { DEFAULT_VISUAL_CUSTOMIZATION as DEFAULT_CUSTOMIZATION } from "@houseplan/types";

export type VoiceLayoutMode = "bottom_bar" | "separate_view";
export type ShellLayoutMode = "command_center" | "classic_rail";

export type PresetDefinition = {
  id: ThemePresetId;
  label: string;
  shellLayoutMode: ShellLayoutMode;
  voiceLayoutMode: VoiceLayoutMode;
  defaults: Pick<UserVisualCustomization, "accentColor" | "backgroundStyle" | "fontFamily" | "radiusScale">;
};

export type ResolvedTheme = {
  presetId: ThemePresetId;
  themeSource: ThemeSource;
  shellLayoutMode: ShellLayoutMode;
  voiceLayoutMode: VoiceLayoutMode;
  accentColor: string;
  backgroundStart: string;
  backgroundEnd: string;
  surface: string;
  text: string;
  mutedText: string;
  fontFamilyVar: string;
  radius: string;
};

const THEME_BY_ID: Record<ThemeId, { backgroundStart: string; backgroundEnd: string; surface: string; text: string; mutedText: string; accent: string }> = {
  default: {
    backgroundStart: "#0f172a",
    backgroundEnd: "#020617",
    surface: "rgba(15, 23, 42, 0.78)",
    text: "#f8fafc",
    mutedText: "#94a3b8",
    accent: "#38bdf8"
  },
  ocean: {
    backgroundStart: "#082f49",
    backgroundEnd: "#0a1328",
    surface: "rgba(15, 23, 42, 0.75)",
    text: "#e0f2fe",
    mutedText: "#7dd3fc",
    accent: "#06b6d4"
  },
  forest: {
    backgroundStart: "#052e16",
    backgroundEnd: "#0b1d12",
    surface: "rgba(20, 33, 22, 0.78)",
    text: "#dcfce7",
    mutedText: "#86efac",
    accent: "#22c55e"
  },
  ember: {
    backgroundStart: "#3f1d1d",
    backgroundEnd: "#1f1414",
    surface: "rgba(42, 22, 22, 0.8)",
    text: "#ffe4e6",
    mutedText: "#fda4af",
    accent: "#fb7185"
  }
};

const BACKGROUND_OVERRIDES: Record<BackgroundStyle, { start: string; end: string }> = {
  graphite: { start: "#111827", end: "#020617" },
  mist: { start: "#1f2937", end: "#0f172a" },
  dusk: { start: "#1e1b4b", end: "#312e81" },
  ember: { start: "#3f1d1d", end: "#1f1414" }
};

const FONT_FAMILY_VARS: Record<FontFamily, string> = {
  space_grotesk: "\"Space Grotesk\"",
  ibm_plex_sans: "\"IBM Plex Sans\"",
  manrope: "Manrope"
};

const RADIUS_VALUES: Record<RadiusScale, string> = {
  compact: "0.4rem",
  rounded: "0.75rem",
  pill: "1rem"
};

export const PRESET_REGISTRY: Record<ThemePresetId, PresetDefinition> = {
  example_1: {
    id: "example_1",
    label: "Command Center",
    shellLayoutMode: "command_center",
    voiceLayoutMode: "bottom_bar",
    defaults: {
      accentColor: DEFAULT_CUSTOMIZATION.accentColor,
      backgroundStyle: "graphite",
      fontFamily: "space_grotesk",
      radiusScale: "rounded"
    }
  },
  example_0: {
    id: "example_0",
    label: "Classic Rail",
    shellLayoutMode: "classic_rail",
    voiceLayoutMode: "separate_view",
    defaults: {
      accentColor: "#22c55e",
      backgroundStyle: "mist",
      fontFamily: "ibm_plex_sans",
      radiusScale: "compact"
    }
  }
};

type ResolveThemeInput = {
  presetId: ThemePresetId;
  themeSource: ThemeSource;
  accentColor: string;
  backgroundStyle: BackgroundStyle;
  fontFamily: FontFamily;
  radiusScale: RadiusScale;
  houseThemeId?: string;
  houseAccentColor?: string;
};

function asThemeId(value: string | undefined): ThemeId {
  if (value === "ocean" || value === "forest" || value === "ember") return value;
  return "default";
}

export function resolveTheme(input: ResolveThemeInput): ResolvedTheme {
  const preset = PRESET_REGISTRY[input.presetId] ?? PRESET_REGISTRY.example_1;
  const hasHouseContext = input.houseThemeId !== undefined || input.houseAccentColor !== undefined;
  const usesHouseTheme = input.themeSource === "house" && hasHouseContext;
  const houseTheme = THEME_BY_ID[asThemeId(input.houseThemeId)];
  const userTheme = THEME_BY_ID.default;
  const base = usesHouseTheme ? houseTheme : userTheme;
  const backgroundOverride = usesHouseTheme
    ? { start: base.backgroundStart, end: base.backgroundEnd }
    : BACKGROUND_OVERRIDES[input.backgroundStyle];

  const accentColor = usesHouseTheme
    ? input.houseAccentColor && input.houseAccentColor.trim().length > 0
      ? input.houseAccentColor
      : base.accent
    : input.accentColor;

  return {
    presetId: preset.id,
    themeSource: input.themeSource,
    shellLayoutMode: preset.shellLayoutMode,
    voiceLayoutMode: preset.voiceLayoutMode,
    accentColor,
    backgroundStart: backgroundOverride.start,
    backgroundEnd: backgroundOverride.end,
    surface: base.surface,
    text: base.text,
    mutedText: base.mutedText,
    fontFamilyVar: FONT_FAMILY_VARS[input.fontFamily],
    radius: RADIUS_VALUES[input.radiusScale]
  };
}
