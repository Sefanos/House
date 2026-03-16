"use client";

import { useEffect } from "react";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";

export function ThemeRuntime() {
  const { resolvedTheme } = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--hp-bg-start", resolvedTheme.backgroundStart);
    root.style.setProperty("--hp-bg-end", resolvedTheme.backgroundEnd);
    root.style.setProperty("--hp-surface", resolvedTheme.surface);
    root.style.setProperty("--hp-text", resolvedTheme.text);
    root.style.setProperty("--hp-muted-text", resolvedTheme.mutedText);
    root.style.setProperty("--hp-accent", resolvedTheme.accentColor);
    root.style.setProperty("--hp-font-family", resolvedTheme.fontFamilyVar);
    root.style.setProperty("--hp-radius", resolvedTheme.radius);
  }, [resolvedTheme]);

  return null;
}
