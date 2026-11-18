"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveDeletionToken } from "./uploader";

/**
 * Write a note directly in the app instead of uploading a file.
 *
 * The text becomes a real `.txt` material for this lesson, so it shows up in the
 * list, downloads and votes like anything else. Editing happens in place; the
 * note is only sent when saved.
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

  const reset = () => {
    setTitle("");
    setText("");
    setError(null);
    setDone(false);
  };

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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
        }}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-semibold text-body transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden>✎</span> Scrivi una nota
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-faint">Nuova nota</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="rounded-lg px-2 py-1 text-xs text-faint hover:bg-surface-3 hover:text-strong"
        >
          Chiudi
        </button>
      </div>

      <label htmlFor="nota-titolo" className="mt-2 block text-[11px] font-medium text-faint">
        Titolo <span className="font-normal">(facoltativo)</span>
      </label>
      <input
        id="nota-titolo"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="Es. Appunti sui partiti di massa"
        className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-strong placeholder:text-faint focus:border-brand-400 focus:outline-none"
      />

      <label htmlFor="nota-testo" className="mt-2 block text-[11px] font-medium text-faint">
        Testo della nota
      </label>
      <textarea
        id="nota-testo"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        spellCheck
        placeholder="Scrivi qui, oppure incolla i tuoi appunti…"
        className="mt-1 w-full resize-y rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-[13px] leading-relaxed text-strong placeholder:text-faint focus:border-brand-400 focus:outline-none"
      />

      <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
        <span className="tabular-nums">
          {text.length.toLocaleString("it-IT")} caratteri · {new TextEncoder().encode(text).length.toLocaleString("it-IT")} byte
        </span>
        {text.length > 80_000 && <span className="text-warn">quasi al limite</span>}
      </div>

      <label htmlFor="nota-autore" className="mt-2 block text-[11px] font-medium text-faint">
        Il tuo nome <span className="font-normal">(facoltativo)</span>
      </label>
      <input
        id="nota-autore"
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        maxLength={80}
        placeholder="Es. Sara P."
        className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-strong placeholder:text-faint focus:border-brand-400 focus:outline-none"
      />

      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
          Nota salvata per {sessionLabel}. La trovi qui accanto.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} disabled={busy || !text.trim()} className="btn-primary flex-1 text-xs">
          {busy ? "Salvataggio…" : "Salva nota"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="rounded-xl border border-line px-3 py-2 text-xs text-muted hover:bg-surface-3 hover:text-strong"
        >
          Svuota
        </button>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-faint">
        La nota diventa un file <code>.txt</code> di questa lezione: chiunque può leggerla e scaricarla. Puoi
        eliminarla da qui finché usi questo browser.
      </p>
    </div>
  );
}
