"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveDeletionToken } from "./uploader";

/**
 * Write a note directly in the app instead of uploading a file.
 *
 * The form opens in a dialog — the same shell as the text reader — so writing
 * does not push the page content around. The text becomes a real `.txt` material
 * for this lesson once saved.
 */
export function NoteEditor({
  sessionId,
  sessionLabel,
  disabled,
  onSaved,
}: {
  sessionId: string;
  sessionLabel: string;
  disabled?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  // Escape closes, background stops scrolling, and the cursor lands in the text.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setError(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  // Focus the close button when it opens without a text field focus (saved state).
  useEffect(() => {
    if (open && done) closeRef.current?.focus();
  }, [open, done]);

  const bytes = new TextEncoder().encode(text).length;

  async function save() {
    if (busy) return;
    if (!text.trim()) {
      setError("Scrivi qualcosa prima di salvare.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          title: title.trim() || undefined,
          body: text,
          uploadedBy: author.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        record?: { key: string; name: string };
        deletionToken?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Non è stato possibile salvare la nota.");
      if (data.record && data.deletionToken) saveDeletionToken(data.record.key, data.deletionToken);

      setDone(true);
      setText("");
      setTitle("");
      onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError(null);
        }}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold text-body transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden>✎</span> Scrivi una nota
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nota-titolo-modale"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
          >
            <div className="flex items-start gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 id="nota-titolo-modale" className="text-sm font-semibold text-strong">
                  Scrivi una nota
                </h2>
                <p className="mt-0.5 truncate text-[11px] text-faint">Per {sessionLabel}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Chiudi"
                className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-faint transition-colors hover:bg-surface-3 hover:text-strong"
              >
                ✕
              </button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-auto p-4">
              <label htmlFor="nota-titolo" className="block text-[11px] font-medium text-faint">
                Titolo <span className="font-normal">(facoltativo)</span>
              </label>
              <input
                id="nota-titolo"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Es. Appunti sui partiti di massa"
                className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-sm text-strong placeholder:text-faint focus:border-brand-400 focus:outline-none"
              />

              <label htmlFor="nota-testo" className="mt-3 block text-[11px] font-medium text-faint">
                Testo della nota
              </label>
              <textarea
                id="nota-testo"
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                spellCheck
                placeholder="Scrivi qui, oppure incolla i tuoi appunti…"
                className="mt-1 w-full resize-y rounded-lg border border-line bg-surface-2 px-2.5 py-2 font-mono text-[13px] leading-relaxed text-strong placeholder:text-faint focus:border-brand-400 focus:outline-none"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                <span className="tabular-nums">
                  {text.length.toLocaleString("it-IT")} caratteri · {bytes.toLocaleString("it-IT")} byte
                </span>
                {text.length > 80_000 && <span className="text-warn">quasi al limite</span>}
              </div>

              <label htmlFor="nota-autore" className="mt-3 block text-[11px] font-medium text-faint">
                Il tuo nome <span className="font-normal">(facoltativo)</span>
              </label>
              <input
                id="nota-autore"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={80}
                placeholder="Es. Sara P."
                className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-sm text-strong placeholder:text-faint focus:border-brand-400 focus:outline-none"
              />

              <p className="mt-3 text-[10px] leading-snug text-faint">
                La nota diventa un file <code>.txt</code> di questa lezione: chiunque può leggerla e scaricarla. Puoi
                eliminarla da qui finché usi questo browser.
              </p>
            </div>

            <div className="border-t border-line px-4 py-3">
              {error && (
                <p role="alert" className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                  {error}
                </p>
              )}
              {done && (
                <p role="status" className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                  Nota salvata per {sessionLabel}. La trovi qui accanto.
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={busy || !text.trim()} className="btn-primary flex-1 text-xs">
                  {busy ? "Salvataggio…" : done ? "Salva un'altra nota" : "Salva nota"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="rounded-xl border border-line px-4 py-2 text-xs text-muted hover:bg-surface-3 hover:text-strong"
                >
                  {done ? "Chiudi" : "Annulla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
