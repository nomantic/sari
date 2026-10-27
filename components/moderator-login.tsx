"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ModeratorLogin() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/moderator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Accesso non riuscito.");
      setDone(true);
      setPasscode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/moderator", { method: "DELETE" });
    setDone(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="surface p-5">
      {done ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-300">Sessione moderatore attiva per 12 ore.</p>
          <p className="text-sm text-mist-300">
            Ora puoi eliminare qualsiasi materiale dalla pagina della lezione: comparirà il pulsante «Rimuovi» su ogni file.
          </p>
          <button type="button" className="btn-ghost" onClick={logout} disabled={busy}>
            {busy ? "…" : "Esci dalla modalità moderatore"}
          </button>
        </div>
      ) : (
        <form onSubmit={login} className="space-y-3">
          <div>
            <label htmlFor="passcode" className="label">
              Codice moderatore
            </label>
            <input
              id="passcode"
              type="password"
              className="input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy || passcode.length === 0}>
            {busy ? "Verifica…" : "Accedi"}
          </button>
        </form>
      )}
    </div>
  );
}
