export type Theme = "light" | "dark";

export const THEME_KEY = "shapellm.theme";

export function parseTheme(value?: string | null): Theme | undefined {
  if (value === "light" || value === "dark") return value;
  return undefined;
}

export function readSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  document.cookie = `${THEME_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}
