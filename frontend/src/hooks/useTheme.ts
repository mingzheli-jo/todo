import { useState, useCallback, useEffect } from "react";

type Theme = "light" | "dark";

const LS_KEY = "toto_theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // ignore
    }
    return "dark";
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(LS_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}
