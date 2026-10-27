import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-white/10">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-mist-400">
        L&apos;insegnamento o la lezione cercata non esiste. Torna al calendario per trovare la lezione giusta.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">
          Torna al calendario
        </Link>
        <Link href="/corsi" className="btn-ghost">
          Insegnamenti
        </Link>
      </div>
    </div>
  );
}
