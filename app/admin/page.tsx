import type { Metadata } from "next";
import { AdminLogin, AdminSessionCard } from "@/components/admin-login";
import { isAdminRequest } from "@/lib/admin";
import { adminConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Amministrazione",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const signedIn = await isAdminRequest();
  const configured = adminConfigured();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">Area riservata</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Amministrazione</h1>
      <p className="mt-3 text-sm text-mist-300">
        Chiunque può caricare e scaricare materiali e pubblicare avvisi. L&apos;eliminazione dei contenuti è riservata
        agli amministratori, che accedono qui con il codice configurato sul server.
      </p>

      <div className="mt-6">
        {signedIn ? (
          <AdminSessionCard />
        ) : configured ? (
          <div className="surface p-5">
            <AdminLogin />
            <p className="mt-3 text-[11px] text-mist-400">
              Il codice è la variabile d&apos;ambiente <code className="rounded bg-black/30 px-1">ADMIN_PASSCODE</code>{" "}
              impostata su Vercel. Nessun altro può eliminare i contenuti.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <p className="font-semibold">Nessun amministratore configurato</p>
            <p className="mt-1 text-amber-200/90">
              Imposta la variabile d&apos;ambiente{" "}
              <code className="rounded bg-black/30 px-1">ADMIN_PASSCODE</code> (almeno 8 caratteri) su Vercel e rideploya.
              Finché non è configurata, nessuno può eliminare contenuti.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-ink-900/50 p-4 text-xs text-mist-400">
        <p className="font-semibold text-mist-300">Cosa può fare un amministratore</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Eliminare materiali di lezione e materiali d&apos;esame di qualsiasi materia.</li>
          <li>Eliminare avvisi dalla bacheca.</li>
          <li>Fissare un avviso in cima.</li>
        </ul>
        <p className="mt-2">Gli studenti non vedono alcun pulsante di eliminazione.</p>
      </div>
    </div>
  );
}
