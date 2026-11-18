"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { forgetDeletionToken, getDeletionToken } from "./uploader";
import { useLocalStorageValue } from "./use-local-storage";
import type { FileRecord } from "@/lib/types";
import { fileTypeBadge, fileTypeTone, formatBytes } from "@/lib/format";
import { sortByUsefulness, votesOf } from "@/lib/votes";
import { VoteButtons } from "./vote-buttons";
import { TextViewer } from "./text-viewer";

/** Always an attachment: the browser saves the file instead of rendering it. */
function downloadHref(key: string): string {
  return `/api/files/download?mode=download&key=${encodeURIComponent(key)}`;
}

/** Plain text can be shown in the reader instead of downloaded. */
const VIEWABLE_EXTENSIONS = new Set(["txt", "md", "csv"]);

function isViewable(file: FileRecord): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
  return VIEWABLE_EXTENSIONS.has(ext);
}

const ACTION_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-body transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-strong";

/**
 * Materials of one lesson or one subject. An admin may delete anything; anyone
 * else only sees "Elimina" on files this browser uploaded. The API enforces the
 * same rule, so hiding the button is convenience, not security.
 */
export function FileList({
  files,
  emptyHint,
  isAdmin = false,
}: {
  files: FileRecord[];
  emptyHint?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<FileRecord | null>(null);

  // Tokens live in localStorage; the hook re-renders when they change.
  const tokenStore = useLocalStorageValue("sari-deletion-tokens");
  const ownKeys = useMemo(() => {
    let tokens: Record<string, string> = {};
    try {
      tokens = tokenStore ? (JSON.parse(tokenStore) as Record<string, string>) : {};
    } catch {
      tokens = {};
    }
    return new Set(Object.keys(tokens));
  }, [tokenStore]);

  async function remove(file: FileRecord) {
    setBusyKey(file.key);
    setError(null);
    try {
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: file.key, token: getDeletionToken(file.key) ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Eliminazione non riuscita.");
      forgetDeletionToken(file.key);
      setConfirmKey(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!files.length) {
    return (
      <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-faint">
        {emptyHint ?? "Nessun materiale ancora per questa lezione. Sei stato in aula? Carica il primo file."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</p>}
      <ul className="space-y-1.5">
        {sortByUsefulness(files).map((file) => {
          const badge = fileTypeBadge(file);
          const tone = fileTypeTone[badge] ?? "bg-surface-2 text-muted ring-line";
          const votes = votesOf(file);
          const viewable = isViewable(file);
          const canDelete = isAdmin || ownKeys.has(file.key);

          return (
            /* One row that wraps: the badge and text sit on the first line, the
               actions flow onto the next line only when the column is too narrow
               for them. A container query reacts to THIS column's width, which
               is what matters — the viewport says nothing about it. */
            <li
              key={file.key}
              className="@container rounded-xl border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-strong"
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <span className={`grid h-9 w-12 shrink-0 place-items-center rounded-lg text-[10px] font-bold ring-1 ring-inset ${tone}`}>
                  {badge}
                </span>

                <div className="min-w-0 flex-1 basis-40">
                  {viewable ? (
                    /* A text note opens in the reader instead of downloading. */
                    <button
                      type="button"
                      onClick={() => setReading(file)}
                      className="block w-full truncate text-left text-sm font-medium text-body underline-offset-4 hover:text-strong hover:underline"
                      title={`Leggi ${file.name}`}
                    >
                      {file.name}
                    </button>
                  ) : (
                    <a
                      href={downloadHref(file.key)}
                      download={file.name}
                      className="block w-full truncate text-sm font-medium text-body underline-offset-4 hover:text-strong hover:underline"
                      title={`Scarica ${file.name}`}
                    >
                      {file.name}
                    </a>
                  )}
                  {/* Meta and votes share a line on wide rows, so the row stays
                      compact instead of stacking four blocks. */}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 truncate text-[11px] text-faint">
                      {formatBytes(file.size)}
                      {file.uploadedBy ? ` · ${file.uploadedBy}` : ""}
                      {file.note ? ` · ${file.note}` : ""}
                    </p>
                    <VoteButtons fileKey={file.key} initialUp={votes.up} initialDown={votes.down} compact />
                  </div>
                </div>

                {/* Actions: beside the name when there is room, otherwise a
                    wrapped row underneath that aligns with the text. */}
                <div className="flex w-full flex-wrap items-center gap-1.5 @[23rem]:w-auto">
                  {viewable && (
                    <button
                      type="button"
                      onClick={() => setReading(file)}
                      className={ACTION_CLASS}
                      aria-label={`Leggi ${file.name}`}
                    >
                      <span aria-hidden>▤</span> Leggi
                    </button>
                  )}
                  <a
                    href={downloadHref(file.key)}
                    download={file.name}
                    className={ACTION_CLASS}
                    aria-label={`Scarica ${file.name}`}
                  >
                    <span aria-hidden>↓</span> Scarica
                  </a>
                  {canDelete &&
                    (confirmKey === file.key ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                          onClick={() => remove(file)}
                          disabled={busyKey === file.key}
                        >
                          {busyKey === file.key ? "…" : "Conferma"}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1.5 text-xs text-faint hover:text-strong"
                          onClick={() => setConfirmKey(null)}
                        >
                          Annulla
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1.5 text-xs text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setConfirmKey(file.key)}
                        aria-label={`Elimina ${file.name}`}
                      >
                        Elimina
                      </button>
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {reading && <TextViewer fileKey={reading.key} name={reading.name} onClose={() => setReading(null)} />}
    </div>
  );
}
