"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorageValue } from "./use-local-storage";

const VOTER_KEY = "sari-voter-id";

/**
 * Stable, opaque per-browser id. Created on first use; sent as a header so the
 * server can keep one vote per browser without any account.
 */
export function useVoterId(): string | null {
  const stored = useLocalStorageValue(VOTER_KEY);
  useEffect(() => {
    if (stored) return;
    try {
      const existing = window.localStorage.getItem(VOTER_KEY);
      if (existing) return;
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      window.localStorage.setItem(VOTER_KEY, id);
    } catch {
      // private mode: voting will be refused rather than counted wrongly
    }
  }, [stored]);
  return stored && stored.length >= 16 ? stored : null;
}

type Choice = 1 | -1 | 0;

/**
 * 👍 / 👎 with a running score. One vote per browser, stored server-side;
 * pressing the same button again removes the vote, and switching sides moves it.
 */
export function VoteButtons({
  fileKey,
  initialUp,
  initialDown,
  compact = false,
}: {
  fileKey: string;
  initialUp: number;
  initialDown: number;
  compact?: boolean;
}) {
  const voterId = useVoterId();
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [mine, setMine] = useState<Choice>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync with the server on mount so a returning voter sees their own vote.
  useEffect(() => {
    if (!voterId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/files/vote?key=${encodeURIComponent(fileKey)}`, {
          headers: { "x-voter-id": voterId },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { up: number; down: number; mine: Choice };
        if (cancelled) return;
        setUp(data.up);
        setDown(data.down);
        setMine(data.mine);
      } catch {
        // keep the server-rendered numbers
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileKey, voterId]);

  const send = useCallback(
    async (vote: Choice) => {
      if (!voterId || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/files/vote", {
          method: "POST",
          headers: { "content-type": "application/json", "x-voter-id": voterId },
          body: JSON.stringify({ key: fileKey, vote }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; up?: number; down?: number; mine?: Choice };
        if (!res.ok) throw new Error(data.error ?? "Voto non registrato.");
        setUp(data.up ?? 0);
        setDown(data.down ?? 0);
        setMine(data.mine ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore inatteso.");
      } finally {
        setBusy(false);
      }
    },
    [fileKey, voterId, busy],
  );

  const score = up - down;
  const disabled = busy || !voterId;

  return (
    <div className={`flex items-center gap-1 ${compact ? "" : "mt-1"}`}>
      <button
        type="button"
        onClick={() => send(1)}
        disabled={disabled}
        aria-pressed={mine === 1}
        aria-label={mine === 1 ? "Rimuovi il tuo voto positivo" : "Segnala come utile"}
        title={mine === 1 ? "Rimuovi il tuo voto" : "Utile"}
        className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
          mine === 1
            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
            : "border-line text-faint hover:border-emerald-500/40 hover:text-emerald-300"
        }`}
      >
        <span aria-hidden>👍</span>
        <span className="tabular-nums">{up}</span>
      </button>

      <button
        type="button"
        onClick={() => send(-1)}
        disabled={disabled}
        aria-pressed={mine === -1}
        aria-label={mine === -1 ? "Rimuovi il tuo voto negativo" : "Segnala come poco utile"}
        title={mine === -1 ? "Rimuovi il tuo voto" : "Poco utile"}
        className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
          mine === -1
            ? "border-red-500/50 bg-red-500/20 text-red-300"
            : "border-line text-faint hover:border-red-500/40 hover:text-red-300"
        }`}
      >
        <span aria-hidden>👎</span>
        <span className="tabular-nums">{down}</span>
      </button>

      <span className="ml-1 text-[10px] text-faint" title="Punteggio (voti utili meno voti poco utili)">
        {score > 0 ? `+${score}` : score}
      </span>

      {error && <span className="ml-1 max-w-40 truncate text-[10px] text-red-300">{error}</span>}
    </div>
  );
}
