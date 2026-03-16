"use client";

import {
  BACKGROUND_STYLES,
  FONT_FAMILIES,
  RADIUS_SCALES,
  THEME_PRESETS,
  type BackgroundStyle,
  type FontFamily,
  type RadiusScale,
  type ThemePresetId,
  type ThemeSource
} from "@houseplan/types";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useCustomizationStore } from "@/store/customization";

export function AppearanceSettings() {
  const { activeHouse } = useResolvedTheme();
  const presetId = useCustomizationStore((state) => state.presetId);
  const themeSource = useCustomizationStore((state) => state.themeSource);
  const accentColor = useCustomizationStore((state) => state.accentColor);
  const backgroundStyle = useCustomizationStore((state) => state.backgroundStyle);
  const fontFamily = useCustomizationStore((state) => state.fontFamily);
  const radiusScale = useCustomizationStore((state) => state.radiusScale);
  const setPresetId = useCustomizationStore((state) => state.setPresetId);
  const setThemeSource = useCustomizationStore((state) => state.setThemeSource);
  const setAccentColor = useCustomizationStore((state) => state.setAccentColor);
  const setBackgroundStyle = useCustomizationStore((state) => state.setBackgroundStyle);
  const setFontFamily = useCustomizationStore((state) => state.setFontFamily);
  const setRadiusScale = useCustomizationStore((state) => state.setRadiusScale);
  const resetCustomization = useCustomizationStore((state) => state.resetCustomization);

  return (
    <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Appearance</h3>
      <select
        value={presetId}
        onChange={(event) => setPresetId(event.target.value as ThemePresetId)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
      >
        {THEME_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {preset === "example_1" ? "Preset: Command Center" : "Preset: Classic Rail"}
          </option>
        ))}
      </select>
      <select
        value={themeSource}
        onChange={(event) => setThemeSource(event.target.value as ThemeSource)}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
      >
        <option value="house">Use House Theme</option>
        <option value="user">Use My Theme</option>
      </select>

      {themeSource === "house" ? (
        <p className="text-[11px] text-slate-400">
          {activeHouse
            ? `Using house style: ${activeHouse.themeId || "default"}`
            : "House theme applies when you are inside a house."}
        </p>
      ) : (
        <>
          <input
            type="color"
            value={accentColor}
            onChange={(event) => setAccentColor(event.target.value)}
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-1"
          />
          <select
            value={backgroundStyle}
            onChange={(event) => setBackgroundStyle(event.target.value as BackgroundStyle)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            {BACKGROUND_STYLES.map((style) => (
              <option key={style} value={style}>
                Background: {style}
              </option>
            ))}
          </select>
          <select
            value={fontFamily}
            onChange={(event) => setFontFamily(event.target.value as FontFamily)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                Font: {family}
              </option>
            ))}
          </select>
          <select
            value={radiusScale}
            onChange={(event) => setRadiusScale(event.target.value as RadiusScale)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            {RADIUS_SCALES.map((radius) => (
              <option key={radius} value={radius}>
                Radius: {radius}
              </option>
            ))}
          </select>
        </>
      )}
      <button
        type="button"
        onClick={resetCustomization}
        className="w-full rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
      >
        Reset Appearance
      </button>
    </section>
  );
}
