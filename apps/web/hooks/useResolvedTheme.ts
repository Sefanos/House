"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { resolveTheme } from "@/lib/theme";
import { useHouses } from "@/hooks/spacetime/useHouses";
import { useCustomizationStore } from "@/store/customization";

function resolveHouseId(pathname: string): string | null {
  const match = pathname.match(/^\/houses\/([^/]+)/);
  return match?.[1] ?? null;
}

export function useResolvedTheme() {
  const pathname = usePathname();
  const houseId = useMemo(() => resolveHouseId(pathname), [pathname]);
  const { houses } = useHouses();
  const presetId = useCustomizationStore((state) => state.presetId);
  const themeSource = useCustomizationStore((state) => state.themeSource);
  const accentColor = useCustomizationStore((state) => state.accentColor);
  const backgroundStyle = useCustomizationStore((state) => state.backgroundStyle);
  const fontFamily = useCustomizationStore((state) => state.fontFamily);
  const radiusScale = useCustomizationStore((state) => state.radiusScale);

  const activeHouse = useMemo(
    () => (houseId ? houses.find((house) => house.id === houseId) ?? null : null),
    [houseId, houses]
  );

  const resolvedTheme = useMemo(
    () =>
      resolveTheme({
        presetId,
        themeSource,
        accentColor,
        backgroundStyle,
        fontFamily,
        radiusScale,
        houseThemeId: activeHouse?.themeId,
        houseAccentColor: activeHouse?.accentColor
      }),
    [presetId, themeSource, accentColor, backgroundStyle, fontFamily, radiusScale, activeHouse]
  );

  return {
    resolvedTheme,
    activeHouse
  };
}
