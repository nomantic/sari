"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Read a text material inside the app, without downloading it.
 *
 * Contents are fetched as raw bytes and decoded as UTF-8 with a lenient
 * fallback, so a note saved with another encoding still displays instead of
 * showing "�" everywhere.
 */
export function TextViewer({
  fileKey,
  name,
  onClose,
}: {
  fileKey: string;
  name: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; text: string; meta: { size: number; uploadedBy: string | null } }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/files/view?key=${encodeURIComponent(fileKey)}`);
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          bytes?: number[];
          size?: number;
          uploadedBy?: string | null;
        };
        if (!res.ok) throw new Error(data.error ?? "Non è stato possibile aprire il file.");
        const bytes = new Uint8Array(data.bytes ?? []);
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
          // Not valid UTF-8 (old Windows note): show something readable anyway.
          text = new TextDecoder("windows-1252").decode(bytes);
        }
        if (cancelled) return;
        setState({ status: "ready", text, meta: { size: data.size ?? bytes.length, uploadedBy: data.uploadedBy ?? null } });
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "Errore inatteso." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileKey]);

  // Escape closes; focus goes to the close button so keyboard users are not lost.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function copy() {
    if (state.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const lines = state.status === "ready" ? state.text.split(/\r\n|\r|\n/) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
      >
        <div className="flex items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="viewer-title" className="truncate text-sm font-semibold text-strong">
              {name}
            </h2>
            <p className="mt-0.5 text-[11px] text-faint">
              {state.status === "ready" && (
                <>
                  {lines.length} righe · {state.meta.size} byte
                  {state.meta.uploadedBy ? ` · ${state.meta.uploadedBy}` : ""}
                </>
              )}
              {state.status === "loading" && "apertura…"}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={state.status !== "ready"}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-body transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-strong disabled:opacity-50"
          >
            {copied ? "✓ Copiato" : "Copia"}
          </button>
          <a
            href={`/api/files/download?mode=download&key=${encodeURIComponent(fileKey)}`}
            download={name}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-body transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-strong"
          >
            ↓ Scarica
          </a>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-faint transition-colors hover:bg-surface-3 hover:text-strong"
          >
            ✕
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-surface-2">
          {state.status === "loading" && <p className="p-6 text-center text-sm text-faint">Apertura del file…</p>}
          {state.status === "error" && (
            <p role="alert" className="p-6 text-center text-sm text-red-300">
              {state.message}
            </p>
          )}
          {state.status === "ready" && (
            /* One scroll container with the numbers in a column, so they stay
               aligned with wrapping lines instead of drifting. */
            <div className="flex min-w-full items-stretch">
              <div
                aria-hidden
                className="select-none border-r border-line px-2 py-4 text-right font-mono text-[12px] leading-[1.6] text-faint/60"
              >
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 whitespace-pre-wrap break-words px-3 py-4 font-mono text-[13px] leading-[1.6] text-body">
                {state.text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
