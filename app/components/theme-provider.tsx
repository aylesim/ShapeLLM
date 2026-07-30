"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { applyTheme, parseTheme, readSystemTheme, THEME_KEY, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}

    const resolved = parseTheme(stored) ?? readSystemTheme();
    if (
      resolved === initialTheme &&
      document.documentElement.dataset.theme === initialTheme
    ) {
      return;
    }
    applyTheme(resolved);
    setThemeState(resolved);
  }, [initialTheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
