"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Admin login form. The passcode comes from the ADMIN_PASSCODE env variable. */
export function AdminLogin() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Accesso non riuscito.");
      setPasscode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={login} className="space-y-3">
      <div>
        <label htmlFor="admin-passcode" className="label">
          Codice amministratore
        </label>
        <input
          id="admin-passcode"
          type="password"
          className="input"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
      </div>
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={busy || passcode.length === 0}>
        {busy ? "Verifica…" : "Accedi come amministratore"}
      </button>
    </form>
  );
}

/** Actions available while the admin session is active. */
export function AdminSessionCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/admin", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="surface p-5">
      <p className="text-sm font-semibold text-emerald-300">Sessione amministratore attiva</p>
      <p className="mt-1.5 text-sm text-mist-300">
        Puoi eliminare materiali e avvisi non pertinenti. I pulsanti <strong className="text-white">Elimina</strong>{" "}
        compaiono sui file in ogni pagina materia e sugli avvisi. La sessione dura 12 ore.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/corsi" className="btn-primary text-xs">
          Materiali delle materie
        </Link>
        <Link href="/avvisi" className="btn-ghost text-xs">
          Avvisi
        </Link>
        <button type="button" className="btn-ghost text-xs" onClick={logout} disabled={busy}>
          {busy ? "…" : "Esci"}
        </button>
      </div>
    </div>
  );
}
