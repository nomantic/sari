"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocalStorageValue } from "./use-local-storage";

export interface Notice {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  pinned: boolean;
}

/** Remembered so a notice is only auto-opened once per person. */
const SEEN_KEY = "sari-notices-seen";

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

/**
 * The notices strip and its reader.
 *
 * The strip stays short; everything is legible in a dialog. On the very first
 * visit the dialog opens on its own. `sari-notices-seen` stores the newest
 * notice id the person has acknowledged, so they are never shown the same
 * notices twice — but a genuinely new notice will open the dialog again.
 */
export function NoticesStrip({ posts }: { posts: Notice[] }) {
  /* `dismissed` rather than `open`: whether the dialog is showing is derived
     from "there is a notice this person has not acknowledged and they have not
     closed it in this session". Deriving avoids setState inside an effect. */
  const [dismissed, setDismissed] = useState(false);
  const [openedByUser, setOpenedByUser] = useState(false);
  const seenValue = useLocalStorageValue(SEEN_KEY);
  const closeRef = useRef<HTMLButtonElement>(null);
  const latestId = posts[0]?.id ?? "";

  /* `useLocalStorageValue` returns null both before hydration and when nothing
     is stored, so a value alone cannot decide whether to auto-open. This store
     reports false during SSR/hydration and true on the client — the one
     reliable "localStorage has been read" signal, without setState in an
     effect. */
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const alreadySeen = hydrated && seenValue !== null && seenValue === latestId;
  const open = openedByUser || (hydrated && !dismissed && !alreadySeen);

  // Acknowledging records the newest id: nothing to re-show until something new lands.
  const closeNow = useCallback(() => {
    setDismissed(true);
    setOpenedByUser(false);
    if (!latestId) return;
    try {
      window.localStorage.setItem(SEEN_KEY, latestId);
    } catch {
      // private mode: the popup will simply open again next time
    }
  }, [latestId]);

  const openByUser = useCallback(() => setOpenedByUser(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeNow]);

  const newest = posts[0];
  const others = posts.length - 1;

  return (
    <>
      <section aria-labelledby="avvisi-barra" className="border-b border-gold-400/20 bg-gold-400/8">
        <div className="mx-auto flex max-w-6xl items-center gap-x-3 px-4 py-2 sm:px-6">
          <h2
            id="avvisi-barra"
            className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-400"
          >
            <span aria-hidden>📣</span> Avvisi
          </h2>

          <button
            type="button"
            onClick={openByUser}
            className="min-w-0 flex-1 truncate text-left text-sm text-body transition-colors hover:text-strong hover:underline"
            title={`${newest.title} — ${newest.body}`}
          >
            {newest.pinned && (
              <span aria-hidden className="mr-1">
                📌
              </span>
            )}
            <strong className="font-semibold text-strong">{newest.title}</strong>
            <span className="text-muted"> — {newest.body}</span>
          </button>

          <button
            type="button"
            onClick={openByUser}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-gold-400 transition-colors hover:bg-gold-400/15"
          >
            {others > 0 ? `Leggi (${posts.length})` : "Leggi"}
          </button>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeNow();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="avvisi-titolo"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
          >
            <div className="flex items-start gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 id="avvisi-titolo" className="text-sm font-semibold text-strong">
                  Avvisi
                </h2>
                <p className="mt-0.5 text-[11px] text-faint">
                  {posts.length} {posts.length === 1 ? "comunicazione" : "comunicazioni"}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeNow}
                aria-label="Chiudi"
                className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-faint transition-colors hover:bg-surface-3 hover:text-strong"
              >
                ✕
              </button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-auto p-4">
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li key={post.id} className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.pinned && (
                        <span className="chip bg-gold-400/15 text-gold-400 ring-gold-400/30">
                          <span aria-hidden>📌</span> In evidenza
                        </span>
                      )}
                      <h3 className="min-w-0 text-sm font-semibold text-strong">{post.title}</h3>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-body">{post.body}</p>
                    <p className="mt-2 text-[11px] text-faint">
                      {post.author} · {relativeDate(post.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 border-t border-line px-4 py-3">
              <a href="/avvisi" className="btn-ghost flex-1 text-xs">
                Vai alla bacheca
              </a>
              <button type="button" onClick={closeNow} className="btn-primary flex-1 text-xs">
                Ho letto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
