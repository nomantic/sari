import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { CURRICULUM_LABELS } from "@/lib/constants";
import { filesBySession, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insegnamenti",
  description: "Tutti gli insegnamenti del corso SARI con calendario delle lezioni e materiali.",
};

const AREA_TONE: Record<string, string> = {
  giuridico: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  economico: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "storico-politico": "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  lingue: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  altro: "bg-white/6 text-mist-300 ring-white/10",
};

export default async function CoursesPage() {
  const { courses } = getCatalog();

  let bySession = new Map<string, FileRecord[]>();
  if (isStorageConfigured()) {
    try {
      bySession = await filesBySession();
    } catch (err) {
      console.error("[corsi] indice materiali non disponibile:", err);
    }
  }

  const groups: Array<{ title: string; subtitle?: string; items: typeof courses }> = [
    { title: "Primo anno", items: courses.filter((c) => c.year === 1) },
    { title: "Secondo anno", items: courses.filter((c) => c.year === 2) },
    {
      title: "Terzo anno",
      subtitle: "Scegli il percorso didattico; gli insegnamenti a scelta sono comuni.",
      items: courses.filter((c) => c.year === 3),
    },
    { title: "Insegnamenti a scelta", subtitle: "Aperti agli studenti del terzo anno di ogni percorso.", items: courses.filter((c) => c.year === 0) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Insegnamenti</h1>
      <p className="mt-3 max-w-2xl text-mist-300">
        L&apos;orario settimanale ufficiale è stato espanso in lezioni datate: apri un insegnamento per vedere ogni lezione
        in ordine cronologico e caricare i materiali.
      </p>

      <div className="mt-10 space-y-12">
        {groups.map((group) => (
          <section key={group.title}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>
              {group.subtitle && <p className="text-sm text-mist-400">{group.subtitle}</p>}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((course) => {
                const files = course.sessions.reduce((sum, s) => sum + (bySession.get(s.id)?.length ?? 0), 0);
                const withFiles = course.sessions.filter((s) => (bySession.get(s.id)?.length ?? 0) > 0).length;
                return (
                  <Link
                    key={course.id}
                    href={`/corsi/${course.slug}`}
                    className="surface card-hover flex h-full flex-col p-4"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${AREA_TONE[course.area] ?? AREA_TONE.altro}`}>{course.area}</span>
                      <span className="chip bg-white/5 text-mist-300 ring-white/10">
                        {course.semester === 1 ? "I sem." : "II sem."}
                      </span>
                      {course.cfu > 0 && (
                        <span className="chip bg-white/5 text-mist-300 ring-white/10">{course.cfu} CFU</span>
                      )}
                      {course.curriculum && (
                        <span className="chip bg-violet-500/15 text-violet-300 ring-violet-500/30">
                          {CURRICULUM_LABELS[course.curriculum]?.label.replace("Percorso ", "") ?? course.curriculum}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-semibold leading-snug text-white">{course.name}</h3>
                    <p className="mt-1 text-xs text-mist-400">{course.professors.join(", ")}</p>

                    <div className="mt-auto pt-3 text-[11px] text-mist-400">
                      <p>
                        {course.sessions.length > 0
                          ? `${course.sessions.length} lezioni · dal ${course.sessions[0].date.split("-").reverse().join("/")}`
                          : "Orario non ancora pubblicato"}
                      </p>
                      <p className={files > 0 ? "mt-1 text-emerald-300" : "mt-1"}>
                        {files > 0
                          ? `${files} ${files === 1 ? "materiale" : "materiali"} · ${withFiles} ${withFiles === 1 ? "lezione coperta" : "lezioni coperte"}`
                          : "Nessun materiale"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
