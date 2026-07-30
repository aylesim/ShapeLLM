"use client";

import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      className="shrink-0 border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? "Theme: Dark" : "Theme: Light"}
    </button>
  );
}
