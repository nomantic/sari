import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ModeratorLogin } from "@/components/moderator-login";
import { MODERATOR_COOKIE, isValidModeratorCookie, moderatorConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderatori",
  robots: { index: false, follow: false },
};

export default async function ModeratorPage() {
  const store = await cookies();
  const signedIn = isValidModeratorCookie(store.get(MODERATOR_COOKIE)?.value);
  const configured = moderatorConfigured();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Accesso moderatori</h1>
      <p className="mt-3 text-sm text-mist-300">
        L&apos;upload è aperto a tutti gli studenti. L&apos;eliminazione dei materiali è invece riservata al moderatore del corso:
        entra con il codice per poter rimuovere file errati, duplicati o non pertinenti.
      </p>

      <div className="mt-6">
        {signedIn ? (
          <div className="surface p-5">
            <p className="text-sm text-emerald-300">Sessione moderatore attiva.</p>
            <p className="mt-2 text-sm text-mist-300">
              Puoi eliminare qualsiasi materiale dalle pagine delle materie, sia delle lezioni sia d&apos;esame.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/corsi" className="btn-primary">
                Vai alle materie
              </Link>
            </div>
          </div>
        ) : configured ? (
          <ModeratorLogin />
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <p className="font-semibold">Nessun codice moderatore impostato</p>
            <p className="mt-1 text-amber-200/90">
              Imposta la variabile d&apos;ambiente <code className="rounded bg-black/30 px-1">MODERATOR_PASSCODE</code> (almeno 8
              caratteri) sul server, insieme a <code className="rounded bg-black/30 px-1">MODERATOR_COOKIE_SECRET</code>. Finché non è
              configurato, nessuno può eliminare materiali.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
