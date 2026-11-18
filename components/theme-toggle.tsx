"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sari-theme";
const CHANGE_EVENT = "sari-theme-change";

/**
 * Theme state, shared by anything that shows or changes it.
 *
 * The initial attribute is set by a tiny inline script in <head> (see
 * layout.tsx) so the correct theme paints on the very first frame — no flash of
 * the wrong colours. Reading it back happens through `useSyncExternalStore`,
 * which keeps SSR (no attribute yet → "dark") and the client in agreement
 * without setState inside an effect.
 */
export function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Applies a theme and tells every listening component. */
export function setTheme(next: Theme): void {
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // private mode: the theme simply won't persist
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useTheme(): Theme {
  return useSyncExternalStore<Theme>(subscribe, readTheme, () => "dark");
}
