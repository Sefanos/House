export type ThemeId = "default" | "ocean" | "forest" | "ember";

export type ThemePresetId = "example_1" | "example_0";
export type ThemeSource = "house" | "user";
export type BackgroundStyle = "graphite" | "mist" | "dusk" | "ember";
export type FontFamily = "space_grotesk" | "ibm_plex_sans" | "manrope";
export type RadiusScale = "compact" | "rounded" | "pill";

export type ThemeTokens = {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
};

export type ThemeDefinition = {
  id: ThemeId | string;
  name: string;
  tokens: ThemeTokens;
};

export type UserVisualCustomization = {
  presetId: ThemePresetId;
  themeSource: ThemeSource;
  accentColor: string;
  backgroundStyle: BackgroundStyle;
  fontFamily: FontFamily;
  radiusScale: RadiusScale;
};

export const THEME_PRESETS: ThemePresetId[] = ["example_1", "example_0"];
export const THEME_SOURCES: ThemeSource[] = ["house", "user"];
export const BACKGROUND_STYLES: BackgroundStyle[] = ["graphite", "mist", "dusk", "ember"];
export const FONT_FAMILIES: FontFamily[] = ["space_grotesk", "ibm_plex_sans", "manrope"];
export const RADIUS_SCALES: RadiusScale[] = ["compact", "rounded", "pill"];

export const DEFAULT_VISUAL_CUSTOMIZATION: UserVisualCustomization = {
  presetId: "example_1",
  themeSource: "house",
  accentColor: "#38bdf8",
  backgroundStyle: "graphite",
  fontFamily: "space_grotesk",
  radiusScale: "rounded"
};
