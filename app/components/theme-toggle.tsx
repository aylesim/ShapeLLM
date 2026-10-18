"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = mounted ? (theme === "dark" ? "Dark" : "Light") : "Theme";
  const aria = mounted
    ? theme === "dark"
      ? "Switch to light theme"
      : "Switch to dark theme"
    : "Toggle theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      className="btn btn--icon theme-toggle"
      aria-label={aria}
      title={aria}
    >
      <span className="theme-glyph" aria-hidden="true">
        {theme === "dark" ? "◐" : "◑"}
      </span>
      <span className="theme-label">{label}</span>
    </button>
  );
}
