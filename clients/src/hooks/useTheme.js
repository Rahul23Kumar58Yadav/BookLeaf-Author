import { useCallback, useEffect, useState } from "react";

const KEY = "bl-theme"; // "light" | "dark" | "system"

const read = () => {
  try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
};

/** Persists theme choice and mirrors it on <html data-theme>. "system" removes the override. */
export function useTheme() {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    theme === "system" ? root.removeAttribute("data-theme") : root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch { /* private mode: ignore */ }
  }, [theme]);

  const toggle = useCallback(() => {
    const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme((t) => {
      const current = t === "system" ? (systemDark ? "dark" : "light") : t;
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  // What the user actually sees right now, so the UI can show the correct icon
  const resolved = theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  return { theme, resolved, toggle };
}