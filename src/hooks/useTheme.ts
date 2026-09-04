import { useEffect } from "react";
import { StorageService } from "../services/storage";

export function useTheme() {
  const theme = "dark" as const;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");

    // Ensure status bar theme-color is black
    const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeColorMetas.forEach((meta) => {
      meta.setAttribute("content", "#000000");
    });

    StorageService.setTheme("dark");
  }, []);

  const toggleTheme = () => {};
  const setTheme = () => {};

  return { theme, toggleTheme, setTheme };
}
