"use client";

/**
 * Small hook exposing localStorage to components without hydration mismatches
 * or setState-inside-effect. `useSyncExternalStore` renders the server snapshot
 * (null) during SSR/hydration and the real value right after.
 */
import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(name: string): string | null {
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

export function useLocalStorageValue(name: string): string | null {
  const getSnapshot = useCallback(() => read(name), [name]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeLocalStorage(name: string, value: string): void {
  try {
    window.localStorage.setItem(name, value);
    listeners.forEach((listener) => listener());
  } catch {
    // private mode / quota exceeded — non-fatal
  }
}

/** Re-read the value after the same tab changed it (storage event is cross-tab only). */
export function notifyLocalStorageChange(): void {
  listeners.forEach((listener) => listener());
}
