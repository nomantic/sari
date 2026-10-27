import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonCard } from "@/components/lesson-card";
import { ExamMaterials } from "@/components/exam-materials";
import { isAdminRequest } from "@/lib/admin";
import { getCatalog, getCourse } from "@/lib/catalog";
import { CURRICULUM_LABELS, SEMESTERS } from "@/lib/constants";
import { ACTIVE_SCOPE } from "@/lib/scope";
import { formatLongDate, todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";
import { examTargetId } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "Materia non trovata" };
  return {
    title: course.name,
    description: `${course.name} (${course.professors.join(", ")}) — lezioni e materiali per data del corso SARI.`,
  };
}

const AREA_TONE: Record<string, string> = {
  giuridico: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  economico: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "storico-politico": "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  lingue: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  altro: "bg-white/6 text-mist-300 ring-white/10",
};

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  let bySession = new Map<string, FileRecord[]>();
  if (isStorageConfigured()) {
    try {
      bySession = await filesByTarget();
    } catch (err) {
      console.error("[corso] indice materiali non disponibile:", err);
    }
  }

  const today = todayIso();
  const nextSession = course.sessions.find((s) => s.date >= today);
  const totalFiles = course.sessions.reduce((sum, s) => sum + (bySession.get(s.id)?.length ?? 0), 0);
  const covered = course.sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
  const examCount = bySession.get(examTargetId(course.id))?.length ?? 0;
  const coverage = course.sessions.length ? Math.round((covered / course.sessions.length) * 100) : 0;
  const uploadsEnabled = isStorageConfigured() && process.env.UPLOADS_ENABLED !== "false";
  const isAdmin = await isAdminRequest();

  const others = getCatalog()
    .courses.filter((c) => c.id !== course.id && c.year === course.year)
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Percorso" className="text-xs text-mist-400">
        <Link href="/" className="hover:text-white">
          Calendario
        </Link>
        <span className="mx-2">/</span>
        <Link href="/corsi" className="hover:text-white">
          Materie
        </Link>
        <span className="mx-2">/</span>
        <span className="text-mist-300">{course.short}</span>
      </nav>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`chip ${AREA_TONE[course.area] ?? AREA_TONE.altro}`}>{course.area}</span>
          <span className="chip bg-white/5 text-mist-300 ring-white/10">{SEMESTERS[course.semester].label}</span>
          {course.cfu > 0 && <span className="chip bg-white/5 text-mist-300 ring-white/10">{course.cfu} CFU</span>}
          {course.code && <span className="chip bg-white/5 text-mist-300 ring-white/10">cod. {course.code}</span>}
          {course.year === 0 ? (
            <span className="chip bg-violet-500/15 text-violet-300 ring-violet-500/30">A scelta</span>
          ) : (
            <span className="chip bg-white/5 text-mist-300 ring-white/10">{course.yearLabel}</span>
          )}
          {course.curriculum && (
            <span className="chip bg-violet-500/15 text-violet-300 ring-violet-500/30">
              {CURRICULUM_LABELS[course.curriculum]?.label ?? course.curriculum}
            </span>
          )}
        </div>

        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          {course.name}
        </h1>
        <p className="mt-2 text-mist-300">{course.professors.join(" · ")}</p>
        {course.note && <p className="mt-2 max-w-2xl text-sm text-mist-400">{course.note}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-mist-400">Lezioni</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{course.sessions.length}</p>
            {course.sessions.length > 0 && (
              <p className="text-[11px] text-mist-400">
                dal {course.sessions[0].date.split("-").reverse().join("/")} al{" "}
                {course.sessions[course.sessions.length - 1].date.split("-").reverse().join("/")}
              </p>
            )}
          </div>
          <div className="surface px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-mist-400">Materiali</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{totalFiles}</p>
            <p className="text-[11px] text-mist-400">
              {covered} {covered === 1 ? "lezione coperta" : "lezioni coperte"} · {coverage}%
            </p>
          </div>
          <div className="surface px-4 py-3 sm:col-span-2">
            <p className="text-[11px] uppercase tracking-wider text-mist-400">Prossima lezione</p>
            {nextSession ? (
              <>
                <p className="mt-1 text-sm font-semibold text-white">{formatLongDate(nextSession.start)}</p>
                <p className="text-[11px] text-mist-400">
                  {nextSession.start.slice(11, 16)}–{nextSession.end.slice(11, 16)} · {nextSession.room}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-mist-300">
                {course.sessions.length ? "Lezioni concluse per questa materia." : "Orario non ancora pubblicato."}
              </p>
            )}
          </div>
        </div>

        {course.sessions.length > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8" title={`${coverage}% delle lezioni ha materiali`}>
            <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${coverage}%` }} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#materiali-esame" className="btn-primary text-xs">
            🎓 Materiali d&apos;esame ({examCount})
          </a>
          <a href="#lezioni" className="btn-ghost text-xs">
            Lezioni ({course.sessions.length})
          </a>
        </div>

        {course.schedule.length > 0 && (
          <div className="mt-6 surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-mist-400">Orario settimanale ufficiale</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {course.schedule.map((slot) => (
                <li key={`${slot.day}-${slot.start}`} className="rounded-lg border border-white/8 bg-ink-950/40 px-2.5 py-1.5">
                  <span className="font-semibold capitalize text-white">{slot.day.replace("day", "dì")}</span>{" "}
                  <span className="tabular-nums text-mist-200">
                    {slot.start}–{slot.end}
                  </span>
                  <span className="text-mist-400"> · {slot.room}</span>
                  {slot.label && <span className="block text-[10px] text-violet-300">{slot.label}</span>}
                </li>
              ))}
            </ul>
            {course.exceptions?.length ? (
              <p className="mt-2 text-[11px] text-amber-300">
                Sospensioni da calendario: {course.exceptions.map((e) => e.date.split("-").reverse().join("/")).join(", ")}
              </p>
            ) : null}
          </div>
        )}
      </header>

      <div className="mt-10">
        <ExamMaterials
          courseId={course.id}
          courseName={course.name}
          files={bySession.get(examTargetId(course.id)) ?? []}
          uploadsEnabled={uploadsEnabled}
          isAdmin={isAdmin}
          stats={[
            { label: "Lezioni con materiali", value: `${covered} / ${course.sessions.length}` },
            { label: "Materiali delle lezioni", value: String(totalFiles) },
            { label: "Crediti", value: course.cfu > 0 ? `${course.cfu} CFU` : "—" },
          ]}
        />
      </div>

      <section className="mt-10" aria-labelledby="lezioni">
        <h2 id="lezioni" className="text-lg font-semibold text-white">
          Lezioni in ordine di data
        </h2>
        <p className="mt-1 text-sm text-mist-400">
          Ogni lezione ha uno spazio dedicato: apri quello giusto per caricare o scaricare i materiali di quella data.
        </p>

        {course.sessions.length === 0 ? (
          <div className="surface mt-4 p-8 text-center text-sm text-mist-400">
            {course.schedule.length === 0
              ? "L'orario di questa materia non è ancora stato pubblicato dal corso di studi."
              : ACTIVE_SCOPE.emptyHint}
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {course.sessions.map((session) => (
              <div key={session.id} id={session.id} className="scroll-mt-24">
                <LessonCard
                  session={session}
                  files={bySession.get(session.id) ?? []}
                  uploadsEnabled={uploadsEnabled}
                  defaultOpen={session.id === nextSession?.id}
                  isToday={session.date === today}
                  isPast={session.date < today}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-mist-400">Altre materie · {course.yearLabel}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((other) => (
              <Link key={other.id} href={`/corsi/${other.slug}`} className="btn-ghost text-xs">
                {other.short}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

