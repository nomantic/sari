import Link from "next/link";
import { LessonFeed } from "@/components/lesson-feed";
import { getCatalog } from "@/lib/catalog";
import { ACADEMIC_YEAR, SOURCE_URLS, YEAR_LABELS } from "@/lib/constants";
import { ACTIVE_SCOPE } from "@/lib/scope";
import { todayIso } from "@/lib/format";
import { filesBySession, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { sessions, courses } = getCatalog();
  const today = todayIso();

  let bySession = new Map<string, FileRecord[]>();
  let storageOk = false;
  try {
    storageOk = isStorageConfigured();
    if (storageOk) bySession = await filesBySession();
  } catch (err) {
    console.error("[home] impossibile leggere l'indice dei materiali:", err);
  }

  const entries = sessions.map((session) => ({ session, files: bySession.get(session.id) ?? [] }));
  const totalFiles = Array.from(bySession.values()).reduce((sum, list) => sum + list.length, 0);
  const upcoming = sessions.filter((s) => s.date >= today);
  const lessonsWithFiles = sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
  const nextLesson = upcoming[0];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section className="pt-12 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
          Università di Roma Tor Vergata · {ACADEMIC_YEAR} · {ACTIVE_SCOPE.label}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          Scienze dell&apos;Amministrazione e delle Relazioni Internazionali
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist-300">
          Tutti i materiali delle lezioni del <strong className="text-white">primo anno, primo semestre</strong> — slide, appunti,
          registrazioni — raccolti per <strong className="text-white">data e ora</strong> della lezione, così ognuno sa
          esattamente dove caricare e dove trovare ciò che serve per il giorno dopo.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {nextLesson ? (
            <Link href={`#${nextLesson.id}`} className="btn-primary">
              Prossima lezione
            </Link>
          ) : null}
          <Link href="/carica" className="btn-ghost">
            Carica un materiale
          </Link>
          <Link href="/corsi" className="btn-ghost">
            Sfoglia gli insegnamenti
          </Link>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Insegnamenti", value: courses.length },
            { label: "Lezioni in calendario", value: sessions.length },
            { label: "Materiali condivisi", value: totalFiles },
            { label: "Lezioni con materiali", value: lessonsWithFiles },
          ].map((stat) => (
            <div key={stat.label} className="surface px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-mist-400">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-white">{stat.value}</dd>
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

        <div className="mt-6 rounded-xl border border-white/8 bg-ink-900/50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">
              Insegnamenti attivi · {ACTIVE_SCOPE.label}
            </p>
            <Link href="/corsi" className="text-xs text-mist-400 underline-offset-4 hover:text-white hover:underline">
              tutti gli insegnamenti →
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {courses.map((course) => {
              const covered = course.sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
              return (
                <Link
                  key={course.id}
                  href={`/corsi/${course.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-white/8 bg-ink-950/40 px-3 py-2 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{course.short}</span>
                    <span className="block truncate text-[11px] text-mist-400">{course.professors.join(", ")}</span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-mist-400">
                    <span className="block tabular-nums">{course.sessions.length} lezioni</span>
                    <span className={covered > 0 ? "block text-emerald-300" : "block"}>{covered} con materiali</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <LessonFeed
        entries={entries}
        uploadsEnabled={storageOk && process.env.UPLOADS_ENABLED !== "false"}
        today={today}
        yearLabels={YEAR_LABELS}
      />

      <p className="mt-10 text-center text-xs text-mist-400">
        Calendario e orari trascritti da{" "}
        <a href={SOURCE_URLS.semesterOne} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-white">
          I semestre
        </a>{" "}
        e{" "}
        <a href={SOURCE_URLS.semesterTwo} target="_blank" rel="noreferrer noopener" className="underline underline-offset-4 hover:text-white">
          II semestre
        </a>
        . In caso di variazioni fa fede il sito ufficiale del corso.
      </p>
    </div>
  );
}


