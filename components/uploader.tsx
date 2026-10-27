"use client";

import { useRef, useState } from "react";
import { notifyLocalStorageChange, useLocalStorageValue, writeLocalStorage } from "./use-local-storage";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

type Phase = "idle" | "checking" | "uploading" | "saving" | "done" | "error";

interface Prepared {
  uploadUrl: string;
  key: string;
  fileName: string;
  contentType: string;
  duplicateName: string | null;
}

interface Props {
  sessionId: string;
  sessionLabel: string;
  disabled?: boolean;
  onUploaded?: () => void;
}

/** Uploads are open to everyone; removing a file is for its uploader or an admin. */

const TOKEN_STORE_KEY = "sari-deletion-tokens";

/** Remember the token that lets this browser remove its own upload later. */
export function saveDeletionToken(key: string, token: string) {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[key] = token;
    window.localStorage.setItem(TOKEN_STORE_KEY, JSON.stringify(parsed));
    notifyLocalStorageChange();
  } catch {
    // Private mode / quota: the uploader cookie still allows deletion.
  }
}

export function getDeletionToken(key: string): string | null {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Record<string, string>)[key] ?? null;
  } catch {
    return null;
  }
}

export function forgetDeletionToken(key: string) {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    delete parsed[key];
    window.localStorage.setItem(TOKEN_STORE_KEY, JSON.stringify(parsed));
    notifyLocalStorageChange();
  } catch {
    // ignore
  }
}

function putWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Il caricamento su storage non è riuscito (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Connessione allo storage interrotta. Se il problema continua, il bucket R2 deve consentire le richieste CORS (vedi README).",
        ),
      );
    xhr.ontimeout = () => reject(new Error("Timeout durante il caricamento."));
    xhr.send(file);
  });
}

export function Uploader({ sessionId, sessionLabel, disabled, onUploaded }: Props) {
  const [queue, setQueue] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const rememberedName = useLocalStorageValue("sari-uploader-name");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadedBy = nameOverride ?? rememberedName ?? "";

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    setQueue((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
    setError(null);
    setPhase("idle");
    setDoneCount(0);
  }

  async function uploadOne(file: File): Promise<void> {
    setPhase("checking");
    setCurrentName(file.name);
    setProgress(0);

    const prepareRes = await fetch("/api/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        fileName: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      }),
    });
    const prepared = (await prepareRes.json().catch(() => ({}))) as Prepared & { error?: string };
    if (!prepareRes.ok) throw new Error(prepared.error ?? "Impossibile preparare il caricamento.");
    if (prepared.duplicateName) setDuplicate(prepared.duplicateName);

    setPhase("uploading");
    await putWithProgress(prepared.uploadUrl, file, prepared.contentType, setProgress);

    setPhase("saving");
    const completeRes = await fetch("/api/uploads/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        key: prepared.key,
        fileName: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
        uploadedBy: uploadedBy.trim() || undefined,
        note: note.trim() || undefined,
      }),
    });
    const completed = (await completeRes.json().catch(() => ({}))) as { error?: string; deletionToken?: string };
    if (!completeRes.ok) throw new Error(completed.error ?? "Impossibile registrare il file.");
    if (completed.deletionToken) saveDeletionToken(prepared.key, completed.deletionToken);
  }

  async function start() {
    if (!queue.length) return;
    if (uploadedBy.trim()) writeLocalStorage("sari-uploader-name", uploadedBy.trim());
    setError(null);
    let done = 0;
    try {
      for (const file of queue) {
        await uploadOne(file);
        done += 1;
        setDoneCount(done);
      }
      setPhase("done");
      setQueue([]);
      setDuplicate(null);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso durante il caricamento.");
      setPhase("error");
      setQueue((prev) => prev.slice(done));
    }
  }

  if (disabled) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
        Il caricamento dei materiali è temporaneamente disattivato.
      </div>
    );
  }

  const busy = phase === "checking" || phase === "uploading" || phase === "saving";

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
          dragOver ? "border-brand-400/70 bg-brand-500/10" : "border-line-strong bg-surface-2"
        }`}
      >
        <p className="text-sm text-muted">
          Trascina qui i file oppure{" "}
          <button type="button" className="font-semibold text-brand-400 underline-offset-4 hover:underline" onClick={() => inputRef.current?.click()}>
            selezionali
          </button>
        </p>
        <p className="mt-1 text-[11px] text-faint">
          PDF, Word, PowerPoint, Excel, immagini, audio/video, ZIP · massimo {MAX_UPLOAD_BYTES / (1024 * 1024)} MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {queue.length > 0 && (
          <ul className="mt-3 space-y-1 text-left">
            {queue.map((f, index) => (
              <li key={`${f.name}:${f.size}:${index}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-body">
                <span className="truncate">{f.name}</span>
                <span className="ml-auto shrink-0 tabular-nums text-faint">{formatBytesClient(f.size)}</span>
                <button
                  type="button"
                  className="shrink-0 rounded px-1 text-faint hover:text-red-300"
                  onClick={() => setQueue((prev) => prev.filter((_, i) => i !== index))}
                  disabled={busy}
                  aria-label={`Togli ${f.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="rounded-xl border border-line bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted">Aggiungi nome e nota (facoltativo)</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Nome e cognome" maxLength={80} value={uploadedBy} onChange={(e) => setNameOverride(e.target.value)} />
          <input className="input" placeholder="Nota (es. slide + appunti)" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </details>

      {duplicate && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
          Esiste già un file chiamato «{duplicate}» per questa lezione: se è lo stesso materiale non serve ricaricarlo.
        </p>
      )}

      {busy && (
        <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="truncate">{currentName}</span>
            <span className="shrink-0 tabular-nums">
              {phase === "checking" ? "preparazione…" : phase === "saving" ? "registrazione…" : `${progress}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
              style={{ width: `${phase === "saving" ? 100 : phase === "checking" ? 5 : progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
          {error}
        </p>
      )}
      {phase === "done" && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200" role="status">
          {doneCount === 1 ? "1 materiale caricato" : `${doneCount} materiali caricati`} per {sessionLabel}. Compariranno qui subito.
        </p>
      )}

      <button type="button" className="btn-primary w-full" onClick={start} disabled={busy || queue.length === 0}>
        {busy ? "Caricamento in corso…" : queue.length ? `Carica ${queue.length === 1 ? "1 file" : `${queue.length} file`}` : "Seleziona un file"}
      </button>
    </div>
  );
}

export function formatBytesClient(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}
