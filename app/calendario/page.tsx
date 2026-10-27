import type { Metadata } from "next";
import Link from "next/link";
import { LessonCalendar } from "@/components/lesson-calendar";
import { getCatalog } from "@/lib/catalog";
import { SEMESTERS } from "@/lib/constants";
import { ACTIVE_SCOPE } from "@/lib/scope";
import { todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendario",
  description: "Calendario mensile delle lezioni del corso SARI: clicca un giorno per vedere le lezioni e i materiali.",
};

export default async function CalendarPage() {
  const { sessions } = getCatalog();
  const today = todayIso();

  let byTarget = new Map<string, FileRecord[]>();
  if (isStorageConfigured()) {
    try {
      byTarget = await filesByTarget();
    } catch (err) {
      console.error("[calendario] indice materiali non disponibile:", err);
    }
  }

  const semester = SEMESTERS[(ACTIVE_SCOPE.semester ?? 1) as 1 | 2];
  const entries = sessions.map((session) => ({ session, files: byTarget.get(session.id) ?? [] }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
            {ACTIVE_SCOPE.label}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-strong sm:text-4xl">Calendario delle lezioni</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Clicca su un giorno per vedere quali lezioni ci sono, in che aula e quali materiali sono già stati caricati.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="btn-ghost text-xs">
            Elenco cronologico
          </Link>
          <Link href="/corsi" className="btn-ghost text-xs">
            Materie
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <LessonCalendar entries={entries} today={today} />
      </div>

      <p className="mt-6 text-xs text-faint">
        Periodo attivo: {semester.label}, dal {semester.start.split("-").reverse().join("/")} al{" "}
        {semester.end.split("-").reverse().join("/")}. Le lezioni sospese e quelle aggiuntive sono già considerate.
      </p>
    </div>
  );
}
