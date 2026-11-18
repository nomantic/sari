import Link from "next/link";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { ACADEMIC_YEAR } from "@/lib/constants";
import { ACTIVE_SCOPE } from "@/lib/scope";
import { todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import { examTargetId, type FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Statistiche",
  description:
    "Quanti materiali ci sono per ogni insegnamento, quante lezioni sono coperte e quanti file sono stati condivisi.",
};

function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** Bytes are usually small here: show KB under a megabyte so 0.0 MB never appears. */
function humanSize(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A single number with its label, used across the top of the page. */
function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="surface px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-strong">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-faint">{hint}</p>}
    </div>
  );
}

export default async function StatsPage() {
  const { sessions, courses, hiddenCount } = getCatalog();
  const today = todayIso();

  let bySession = new Map<string, FileRecord[]>();
  let storageOk = false;
  try {
    storageOk = isStorageConfigured();
    if (storageOk) bySession = await filesByTarget();
  } catch (err) {
    console.error("[statistiche] impossibile leggere l'indice dei materiali:", err);
  }

  const lessonFiles = sessions.reduce((sum, s) => sum + (bySession.get(s.id)?.length ?? 0), 0);
  const examFiles = courses.reduce((sum, c) => sum + (bySession.get(examTargetId(c.id))?.length ?? 0), 0);
  const covered = sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
  const bytes = [...bySession.values()].flat().reduce((sum, f) => sum + f.size, 0);
  const past = sessions.filter((s) => s.date < today).length;

  const rows = courses
    .map((course) => {
      const files = course.sessions.reduce((sum, s) => sum + (bySession.get(s.id)?.length ?? 0), 0);
      const withFiles = course.sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
      return {
        course,
        lessons: course.sessions.length,
        files,
        exams: bySession.get(examTargetId(course.id))?.length ?? 0,
        covered: withFiles,
        coverage: percent(withFiles, course.sessions.length),
      };
    })
    .sort((a, b) => b.covered - a.covered || b.files - a.files);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
        {ACTIVE_SCOPE.label} · {ACADEMIC_YEAR}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-strong sm:text-3xl">Statistiche</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Quanto è coperto il semestre: materiali per insegnamento, lezioni già servite da almeno un file e spazio
        occupato. Aggiornate a ogni caricamento.
      </p>

      {!storageOk && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">Storage non configurato</p>
          <p className="mt-1 text-amber-200/90">
            Il catalogo è visibile, ma i conteggi dei materiali restano a zero finché il server non ha le chiavi del
            bucket.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Materie" value={courses.length} hint={ACTIVE_SCOPE.label} />
        <StatCard label="Lezioni in calendario" value={sessions.length} hint={`${past} già svolte`} />
        <StatCard
          label="Materiali delle lezioni"
          value={lessonFiles}
          hint={`${covered} lezioni coperte · ${percent(covered, sessions.length)}%`}
        />
        <StatCard label="Materiali d'esame" value={examFiles} hint="per tutta la materia" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Lezioni con materiali"
          value={covered}
          hint={`su ${sessions.length} in calendario`}
        />
        <StatCard
          label="Copertura del semestre"
          value={`${percent(covered, sessions.length)}%`}
          hint="lezioni con almeno un file"
        />
        <StatCard
          label="File totali"
          value={lessonFiles + examFiles}
          hint="lezioni + esame"
        />
        <StatCard label="Spazio usato" value={humanSize(bytes)} hint="nel bucket" />
      </div>

      <section className="mt-10" aria-labelledby="per-materia">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="per-materia" className="text-sm font-semibold text-strong">
            Copertura per materia
          </h2>
          <Link href="/corsi" className="text-xs text-faint underline-offset-4 hover:text-strong hover:underline">
            tutte le materie →
          </Link>
        </div>

        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.course.id} className="surface p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={`/corsi/${row.course.slug}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-strong hover:underline">
                  {row.course.name}
                </Link>
                <span className="shrink-0 text-[11px] tabular-nums text-faint">
                  {row.covered}/{row.lessons} lezioni · {row.files} materiali
                  {row.exams > 0 ? ` · esame: ${row.exams}` : ""}
                </span>
                <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">{row.coverage}%</span>
              </div>
              {/* A simple bar: comparable at a glance, no chart library. */}
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={`${row.coverage}% delle lezioni ha almeno un materiale`}
              >
                <div
                  className={`h-full rounded-full ${row.coverage >= 65 ? "bg-emerald-400" : row.coverage >= 30 ? "bg-brand-400" : "bg-gold-400"}`}
                  style={{ width: `${Math.max(row.coverage, row.files > 0 ? 3 : 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {hiddenCount > 0 && (
        <p className="mt-8 text-xs text-faint">
          {hiddenCount} insegnamenti fuori dal periodo attivo non sono conteggiati.{" "}
          <Link href="/corsi" className="underline-offset-4 hover:text-strong hover:underline">
            Vedi tutti gli insegnamenti
          </Link>
          .
        </p>
      )}
    </div>
  );
}
