import { useState, useEffect } from "react";
import { StorageService } from "../services/storage";

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark" | "auto">(() =>
    StorageService.getTheme()
  );

  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        theme === "dark" ||
        (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }

      // Synchronize mobile PWA status bar theme-color
      const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
      const targetColor = isDark ? "#020617" : "#f8fafc";
      themeColorMetas.forEach((meta) => {
        meta.setAttribute("content", targetColor);
      });
    };

    applyTheme();
    StorageService.setTheme(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "auto") applyTheme();
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: "light" | "dark" | "auto") => {
    setThemeState(newTheme);
  };

  return { theme, toggleTheme, setTheme };
}
