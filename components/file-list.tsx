"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getDeletionToken, forgetDeletionToken } from "./uploader";
import { useLocalStorageValue } from "./use-local-storage";
import type { FileRecord } from "@/lib/types";
import { fileTypeBadge, fileTypeTone, formatBytes } from "@/lib/format";

export function FileList({ files, emptyHint }: { files: FileRecord[]; emptyHint?: string }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tokens live in localStorage; this hook re-renders when they change (after
  // an upload or a removal) without reading storage during SSR.
  const tokenStore = useLocalStorageValue("sari-deletion-tokens");
  const owned = useMemo(() => {
    let tokens: Record<string, string> = {};
    try {
      tokens = tokenStore ? (JSON.parse(tokenStore) as Record<string, string>) : {};
    } catch {
      tokens = {};
    }
    return new Set(files.filter((file) => typeof tokens[file.key] === "string").map((file) => file.key));
  }, [files, tokenStore]);

  async function remove(file: FileRecord) {
    setBusyKey(file.key);
    setError(null);
    try {
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: file.key, token: getDeletionToken(file.key) }),
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
      <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-mist-400">
        {emptyHint ?? "Nessun materiale ancora per questa lezione. Sei stato in aula? Carica il primo file."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</p>}
      <ul className="space-y-1.5">
        {files.map((file) => {
          const badge = fileTypeBadge(file);
          const tone = fileTypeTone[badge] ?? "bg-white/6 text-mist-300 ring-white/10";
          const isOwned = owned.has(file.key);
          return (
            <li
              key={file.key}
              className="group flex items-center gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-2.5 transition-colors hover:border-white/16"
            >
              <span className={`grid h-9 w-12 shrink-0 place-items-center rounded-lg text-[10px] font-bold ring-1 ring-inset ${tone}`}>
                {badge}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/files/download?key=${encodeURIComponent(file.key)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block truncate text-sm font-medium text-mist-200 underline-offset-4 hover:text-white hover:underline"
                  title={file.name}
                >
                  {file.name}
                </a>
                <p className="mt-0.5 truncate text-[11px] text-mist-400">
                  {formatBytes(file.size)}
                  {file.uploadedBy ? ` · ${file.uploadedBy}` : ""}
                  {file.note ? ` · ${file.note}` : ""}
                </p>
              </div>
              <a
                href={`/api/files/download?key=${encodeURIComponent(file.key)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-mist-400 transition-colors hover:bg-white/8 hover:text-white"
                aria-label={`Apri ${file.name}`}
              >
                Apri
              </a>
              {isOwned &&
                (confirmKey === file.key ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30"
                      onClick={() => remove(file)}
                      disabled={busyKey === file.key}
                    >
                      {busyKey === file.key ? "…" : "Conferma"}
                    </button>
                    <button type="button" className="rounded-lg px-2 py-1.5 text-xs text-mist-400 hover:text-white" onClick={() => setConfirmKey(null)}>
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-mist-400 opacity-0 transition-opacity hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                    onClick={() => setConfirmKey(file.key)}
                    aria-label={`Rimuovi ${file.name}`}
                  >
                    Rimuovi
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
