import { useEffect } from "react";
import { StorageService } from "../services/storage";

export function useTheme() {
  const theme = "light" as const;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");

    // Ensure status bar theme-color is white
    const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeColorMetas.forEach((meta) => {
      meta.setAttribute("content", "#ffffff");
    });

    StorageService.setTheme("light");
  }, []);

  const toggleTheme = () => {};
  const setTheme = () => {};

  return { theme, toggleTheme, setTheme };
}
