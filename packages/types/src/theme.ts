export type ThemeId = "default" | "dark";

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
