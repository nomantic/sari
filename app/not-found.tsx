import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-strong/10">404</p>
      <h1 className="mt-4 text-2xl font-bold text-strong">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-faint">
        La materia o la lezione cercata non esiste. Torna al calendario per trovare la lezione giusta.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">
          Torna al calendario
        </Link>
        <Link href="/corsi" className="btn-ghost">
          Materie
        </Link>
      </div>
    </div>
  );
}
