import { useState, useEffect, useCallback } from "react";
import { StorageService, ThemeMode } from "../services/storage";

export type ResolvedTheme = "dark" | "light" | "zara";

export const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  dark: "#000000",
  light: "#f4f4f5",
  zara: "#E2C4A6",
};

export const THEME_OPTIONS: Array<{
  id: ThemeMode;
  label: string;
  sublabel: string;
  previewBg: string;
  previewBorder: string;
  previewText: string;
  icon: string;
}> = [
  {
    id: "dark",
    label: "Dark",
    sublabel: "Pure OLED Black",
    previewBg: "#000000",
    previewBorder: "#ffffff",
    previewText: "#ffffff",
    icon: "moon",
  },
  {
    id: "light",
    label: "Light",
    sublabel: "Clean Minimal White",
    previewBg: "#ffffff",
    previewBorder: "#000000",
    previewText: "#000000",
    icon: "sun",
  },
  {
    id: "zara",
    label: "Zara",
    sublabel: "Vanilla Custard",
    previewBg: "#F3E0BE",
    previewBorder: "#000000",
    previewText: "#000000",
    icon: "sparkles",
  },
];

function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "zara") return "zara";
  return mode === "light" ? "light" : "dark";
}

function applyThemeToDOM(resolved: ResolvedTheme, mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-mode", mode);

  // Set class for tailwind darkMode class selector
  root.classList.remove("light", "dark", "zara");
  if (resolved === "light") {
    root.classList.add("light");
  } else if (resolved === "zara") {
    root.classList.add("zara");
  } else {
    root.classList.add("dark");
  }

  // Update status bar theme-color
  const hexColor = THEME_META_COLORS[resolved] || "#000000";
  const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
  themeColorMetas.forEach((meta) => {
    meta.setAttribute("content", hexColor);
  });
}

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return StorageService.getTheme();
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = StorageService.getTheme();
    return resolveThemeMode(initial);
  });

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    const resolved = resolveThemeMode(newMode);
    setThemeModeState(newMode);
    setResolvedTheme(resolved);

    StorageService.setTheme(newMode);
    applyThemeToDOM(resolved, newMode);

    // Notify other components
    window.dispatchEvent(
      new CustomEvent("mytimetable_theme_changed", {
        detail: { themeMode: newMode, resolvedTheme: resolved },
      })
    );
  }, []);

  // Sync with storage on mount and when changed elsewhere
  useEffect(() => {
    const currentMode = StorageService.getTheme();
    const resolved = resolveThemeMode(currentMode);
    setThemeModeState(currentMode);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved, currentMode);

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ themeMode: ThemeMode; resolvedTheme: ResolvedTheme }>;
      if (customEvent.detail) {
        setThemeModeState(customEvent.detail.themeMode);
        setResolvedTheme(customEvent.detail.resolvedTheme);
      } else {
        const stored = StorageService.getTheme();
        setThemeModeState(stored);
        setResolvedTheme(resolveThemeMode(stored));
      }
    };

    window.addEventListener("mytimetable_theme_changed", handleSync);
    return () => window.removeEventListener("mytimetable_theme_changed", handleSync);
  }, []);

  return {
    theme: resolvedTheme,
    themeMode,
    resolvedTheme,
    setThemeMode,
    isDark: resolvedTheme === "dark",
    isZara: resolvedTheme === "zara",
  };
}
