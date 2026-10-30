import Link from "next/link";
import { LessonViews } from "@/components/lesson-views";
import { getCatalog } from "@/lib/catalog";
import { ACADEMIC_YEAR, SOURCE_URLS, YEAR_LABELS } from "@/lib/constants";
import { ACTIVE_SCOPE } from "@/lib/scope";
import { todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";
import { examTargetId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { sessions, courses } = getCatalog();
  const today = todayIso();

  let bySession = new Map<string, FileRecord[]>();
  let storageOk = false;
  try {
    storageOk = isStorageConfigured();
    if (storageOk) bySession = await filesByTarget();
  } catch (err) {
    console.error("[home] impossibile leggere l'indice dei materiali:", err);
  }

  const entries = sessions.map((session) => ({ session, files: bySession.get(session.id) ?? [] }));
  const totalFiles = entries.reduce((sum, entry) => sum + entry.files.length, 0);
  const examFiles = courses.reduce((sum, course) => sum + (bySession.get(examTargetId(course.id))?.length ?? 0), 0);
  const upcoming = sessions.filter((s) => s.date >= today);
  const lessonsWithFiles = sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
  const nextLesson = upcoming[0];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section className="pt-12 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
          {ACTIVE_SCOPE.label} · {ACADEMIC_YEAR}
        </p>
        {/* Short and scannable: the full course name is in the footer and in the
            page metadata, so it does not need to dominate the first screen. */}
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-strong sm:text-3xl">
          Materiali delle lezioni
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Slide, appunti e registrazioni, ordinati per <strong className="text-strong">data e ora</strong> della lezione.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
          {nextLesson ? (
            <Link href={`#${nextLesson.id}`} className="btn-primary">
              Prossima lezione
            </Link>
          ) : null}
          <Link href="/carica" className="btn-ghost">
            Carica un materiale
          </Link>
          <Link href="/corsi" className="btn-ghost">
            Vedi le materie
          </Link>
        </div>

        

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Materie", value: courses.length },
            { label: "Lezioni in calendario", value: sessions.length },
            { label: "Materiali delle lezioni", value: totalFiles },
            { label: "Materiali d'esame", value: examFiles },
            { label: "Lezioni con materiali", value: lessonsWithFiles },
          ].map((stat) => (
            <div key={stat.label} className="surface px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-faint">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-strong">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {!storageOk && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <p className="font-semibold">Storage non configurato</p>
            <p className="mt-1 text-amber-200/90">
              Il calendario è visibile, ma caricamento e download sono disattivati: il server non ha le chiavi del bucket.
            </p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-amber-200/80">
              <li>
                Cloudflare → <strong>R2</strong> → <strong>Manage R2 API Tokens</strong> → <em>Create API Token</em>, permesso{" "}
                <strong>Object Read &amp; Write</strong> sul bucket <code className="rounded bg-black/30 px-1">sari</code>.
              </li>
              <li>
                Copia in <code className="rounded bg-black/30 px-1">.env.local</code>:{" "}
                <code className="rounded bg-black/30 px-1">R2_ACCESS_KEY_ID</code> e{" "}
                <code className="rounded bg-black/30 px-1">R2_SECRET_ACCESS_KEY</code>.
              </li>
              <li>
                Verifica con <code className="rounded bg-black/30 px-1">npm run check:r2</code> e riavvia il server.
              </li>
            </ol>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-faint">
              Materie attive · {ACTIVE_SCOPE.label}
            </p>
            <Link href="/corsi" className="text-xs text-faint underline-offset-4 hover:text-strong hover:underline">
              tutte le materie →
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {courses.map((course) => {
              const covered = course.sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
              const exams = bySession.get(examTargetId(course.id))?.length ?? 0;
              return (
                <div
                  key={course.id}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 transition-colors hover:border-brand-400/40"
                >
                  <Link href={`/corsi/${course.slug}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-strong hover:underline">{course.short}</span>
                    <span className="block truncate text-[11px] text-faint">{course.professors.join(", ")}</span>
                  </Link>
                  <span className="shrink-0 text-right text-[11px] text-faint">
                    <span className="block tabular-nums">{course.sessions.length} lezioni</span>
                    <span className={covered > 0 ? "block text-emerald-300" : "block"}>{covered} con materiali</span>
                  </span>
                  <Link
                    href={`/corsi/${course.slug}#materiali-esame`}
                    className={`shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      exams > 0
                        ? "border-gold-400/40 bg-gold-400/15 text-gold-400 hover:bg-gold-400/25"
                        : "border-line text-faint hover:border-gold-400/40 hover:text-gold-400"
                    }`}
                    title={`Materiali d'esame (${exams})`}
                  >
                    🎓 {exams > 0 ? exams : "Esame"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <LessonViews
        entries={entries}
        today={today}
        yearLabels={YEAR_LABELS}
      />

      <p className="mt-10 text-center text-xs text-faint">
        Calendario e orari trascritti da{" "}
        <a href={SOURCE_URLS.semesterOne} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-strong">
          I semestre
        </a>{" "}
        e{" "}
        <a href={SOURCE_URLS.semesterTwo} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-strong">
          II semestre
        </a>
        . In caso di variazioni fa fede il sito ufficiale del corso.
      </p>
    </div>
  );
}



