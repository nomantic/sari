"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sari-theme";
const CHANGE_EVENT = "sari-theme-change";

/**
 * Theme toggle.
 *
 * The initial attribute is set by a tiny inline script in <head> (see
 * layout.tsx) so the correct theme paints on the very first frame — no flash of
 * the wrong colours. Reading it back happens through `useSyncExternalStore`,
 * which keeps SSR (no attribute yet → "dark") and the client in agreement
 * without setState inside an effect.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "dark");

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode: the theme simply won't persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "light" ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={next === "light" ? "Tema chiaro" : "Tema scuro"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-base text-muted transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-strong"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
