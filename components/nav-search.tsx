"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchHit, SearchKind } from "@/lib/search";

const KIND_LABEL: Record<SearchKind, string> = {
  materia: "Materia",
  lezione: "Lezione",
  avviso: "Avviso",
};

const KIND_ICON: Record<SearchKind, string> = {
  materia: "📚",
  lezione: "📅",
  avviso: "📣",
};

/**
 * Global search living in the header. Searches subjects, lessons and notices
 * through `/api/search`; results are keyboard navigable (↑ ↓ Enter Esc).
 */
export function NavSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  // Two instances can be mounted at once (header + mobile row); ids must be unique.
  const uniqueId = useId();
  const listId = `search-results-${uniqueId}`;
  const inputId = `nav-search-${uniqueId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  // Debounced fetch; aborts the previous request so results never race.
  useEffect(() => {
    const q = value.trim();
    // Too short to search: the panel is not shown at all, so no state reset is
    // needed here (setState inside an effect body would cascade renders).
    if (q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`, { signal: controller.signal });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits);
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setHits([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  // Results belong to the query that produced them: if the box is cleared or
  // shortened, ignore any leftovers from the previous query.
  const visibleHits = value.trim().length >= 2 ? hits : [];

  // Close on outside click.
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Cmd/Ctrl+K focuses the box from anywhere. Two instances can be mounted
  // (desktop header + mobile row); focus whichever one is actually visible.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = inputRef.current;
        if (!input || input.offsetParent === null) return; // this instance is hidden
        event.preventDefault();
        input.focus();
        input.select();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: SearchHit) {
    setOpen(false);
    setValue("");
    inputRef.current?.blur();
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || visibleHits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % visibleHits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? visibleHits.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      go(visibleHits[active]);
    }
  }

  const showPanel = open && value.trim().length >= 2;

  return (
    <div ref={boxRef} className={`relative w-full ${compact ? "" : "sm:w-64 lg:w-80"}`}>
      <label htmlFor={inputId} className="sr-only">
        Cerca nel sito
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint sm:left-3" aria-hidden>
          ⌕
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-8 pr-2 text-sm text-strong placeholder:text-faint/70 focus:border-brand-400/60 focus:outline-none sm:pl-9 sm:pr-3"
          placeholder="Cerca…"
          aria-label="Cerca materia, lezione o avviso"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-faint" aria-hidden>
            …
          </span>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl shadow-black/50 sm:w-[26rem]">
          {visibleHits.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-faint">
              {loading ? "Sto cercando…" : `Nessun risultato per «${value.trim()}».`}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Risultati della ricerca" className="max-h-96 overflow-y-auto py-1">
              {visibleHits.map((hit, index) => (
                <li key={hit.id} role="option" aria-selected={index === active}>
                  <Link
                    href={hit.href}
                    onClick={() => {
                      setOpen(false);
                      setValue("");
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={`flex items-start gap-2.5 px-3 py-2 text-sm transition-colors ${
                      index === active ? "bg-brand-500/15" : "hover:bg-surface-2"
                    }`}
                  >
                    <span aria-hidden className="mt-0.5 text-xs">
                      {KIND_ICON[hit.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-strong">{hit.title}</span>
                      {hit.subtitle && <span className="block truncate text-[11px] text-faint">{hit.subtitle}</span>}
                    </span>
                    <span className="mt-0.5 shrink-0 text-[10px] uppercase tracking-wider text-faint">
                      {KIND_LABEL[hit.kind]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-3 py-1.5 text-[10px] text-faint">
            ↑ ↓ per muoversi · Invio per aprire · Esc per chiudere
          </p>
        </div>
      )}
    </div>
  );
}
