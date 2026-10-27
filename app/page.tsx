import Link from "next/link";
import { LessonViews } from "@/components/lesson-views";
import { getCatalog } from "@/lib/catalog";
import { ACADEMIC_YEAR, SOURCE_URLS, YEAR_LABELS } from "@/lib/constants";
import { ACTIVE_SCOPE } from "@/lib/scope";
import { todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import { listNews, type NewsPost } from "@/lib/news";
import { isAdminRequest } from "@/lib/admin";
import type { FileRecord } from "@/lib/types";
import { examTargetId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { sessions, courses } = getCatalog();
  const today = todayIso();

  let bySession = new Map<string, FileRecord[]>();
  let storageOk = false;
  let latestNews: NewsPost[] = [];
  try {
    storageOk = isStorageConfigured();
    if (storageOk) bySession = await filesByTarget();
  } catch (err) {
    console.error("[home] impossibile leggere l'indice dei materiali:", err);
  }
  if (storageOk) {
    try {
      const posts = await listNews();
      latestNews = [...posts].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).slice(0, 3);
    } catch (err) {
      console.error("[home] impossibile leggere gli avvisi:", err);
    }
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
            Vedi le materie
          </Link>
        </div>

        {latestNews.length > 0 && (
          <section aria-labelledby="avvisi-home" className="mt-8">
            <div className="rounded-2xl border border-gold-400/25 bg-gradient-to-br from-gold-400/10 via-ink-900/70 to-ink-900/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="avvisi-home" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gold-400">
                  <span aria-hidden>📣</span> Avvisi
                </h2>
                <Link href="/avvisi" className="text-xs font-medium text-gold-400 underline-offset-4 hover:underline">
                  tutti gli avvisi →
                </Link>
              </div>

              <ul className="mt-3 space-y-2">
                {latestNews.slice(0, 3).map((post, index) => (
                  <li key={post.id}>
                    <Link
                      href="/avvisi"
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:border-gold-400/50 hover:bg-gold-400/5 ${
                        index === 0 ? "border-gold-400/30 bg-ink-950/50" : "border-white/8 bg-ink-950/30"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          {post.pinned && <span className="chip bg-gold-400/20 text-gold-400 ring-gold-400/40">📌 Fissato</span>}
                          <span className="text-sm font-semibold text-white">{post.title}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-mist-300">{post.body}</span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] text-mist-400">{post.author}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Link href="/avvisi" className="mt-3 inline-block text-xs text-mist-300 underline-offset-4 hover:text-white hover:underline">
                Scrivi anche tu un avviso →
              </Link>
            </div>
          </section>
        )}

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Materie", value: courses.length },
            { label: "Lezioni in calendario", value: sessions.length },
            { label: "Materiali delle lezioni", value: totalFiles },
            { label: "Materiali d'esame", value: examFiles },
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
              Materie attive · {ACTIVE_SCOPE.label}
            </p>
            <Link href="/corsi" className="text-xs text-mist-400 underline-offset-4 hover:text-white hover:underline">
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
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-ink-950/40 px-3 py-2 transition-colors hover:border-brand-400/40"
                >
                  <Link href={`/corsi/${course.slug}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white hover:underline">{course.short}</span>
                    <span className="block truncate text-[11px] text-mist-400">{course.professors.join(", ")}</span>
                  </Link>
                  <span className="shrink-0 text-right text-[11px] text-mist-400">
                    <span className="block tabular-nums">{course.sessions.length} lezioni</span>
                    <span className={covered > 0 ? "block text-emerald-300" : "block"}>{covered} con materiali</span>
                  </span>
                  <Link
                    href={`/corsi/${course.slug}#materiali-esame`}
                    className={`shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      exams > 0
                        ? "border-gold-400/40 bg-gold-400/15 text-gold-400 hover:bg-gold-400/25"
                        : "border-white/10 text-mist-400 hover:border-gold-400/40 hover:text-gold-400"
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
        uploadsEnabled={storageOk && process.env.UPLOADS_ENABLED !== "false"}
        isAdmin={await isAdminRequest()}
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



