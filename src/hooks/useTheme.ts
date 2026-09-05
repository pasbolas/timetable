import { useState, useEffect, useCallback } from "react";
import { StorageService, ThemeMode } from "../services/storage";

export type ResolvedTheme = "dark" | "light" | "midnight" | "sunset";

export const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  dark: "#000000",
  light: "#ffffff",
  midnight: "#0b0f19",
  sunset: "#180d15",
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
    id: "midnight",
    label: "Midnight",
    sublabel: "Deep Navy & Sky Blue",
    previewBg: "#0b0f19",
    previewBorder: "#38bdf8",
    previewText: "#38bdf8",
    icon: "sparkles",
  },
  {
    id: "sunset",
    label: "Sunset",
    sublabel: "Warm Rose & Plum",
    previewBg: "#180d15",
    previewBorder: "#fb7185",
    previewText: "#fb7185",
    icon: "flame",
  },
  {
    id: "system",
    label: "Auto",
    sublabel: "Sync with Device",
    previewBg: "#27272a",
    previewBorder: "#a1a1aa",
    previewText: "#ffffff",
    icon: "monitor",
  },
];

function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }
  return mode;
}

function applyThemeToDOM(resolved: ResolvedTheme, mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-mode", mode);

  // Set class for tailwind darkMode class selector
  if (resolved === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
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

  // Listen for system color-scheme changes if in system mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      const currentMode = StorageService.getTheme();
      if (currentMode === "system") {
        const resolved = resolveThemeMode("system");
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved, "system");
        window.dispatchEvent(
          new CustomEvent("mytimetable_theme_changed", {
            detail: { themeMode: "system", resolvedTheme: resolved },
          })
        );
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  return {
    theme: resolvedTheme,
    themeMode,
    resolvedTheme,
    setThemeMode,
    isDark: resolvedTheme !== "light",
  };
}
