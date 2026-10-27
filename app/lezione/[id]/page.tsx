import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPanel } from "@/components/lesson-panel";
import { isAdminRequest } from "@/lib/admin";
import { getCatalog, getSession } from "@/lib/catalog";
import { todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function humanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]} ${y}`;
}

function timeOf(isoDateTime: string) {
  return isoDateTime.slice(11, 16);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const session = getSession(id);
  if (!session) return { title: "Lezione non trovata" };
  return {
    title: `${session.courseName} · ${humanDate(session.date)}`,
    description: `Materiali della lezione di ${session.courseName} del ${humanDate(session.date)}, ${timeOf(session.start)}–${timeOf(session.end)}.`,
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();

  const today = todayIso();
  const { sessions } = getCatalog();

  let byTarget = new Map<string, FileRecord[]>();
  if (isStorageConfigured()) {
    try {
      byTarget = await filesByTarget();
    } catch (err) {
      console.error("[lezione] indice materiali non disponibile:", err);
    }
  }

  const files = byTarget.get(session.id) ?? [];
  const uploadsEnabled = isStorageConfigured() && process.env.UPLOADS_ENABLED !== "false";
  const isAdmin = await isAdminRequest();

  // Same day's other lessons, for orientation without leaving the context.
  const sameDay = sessions.filter((s) => s.date === session.date && s.id !== session.id);

  const index = sessions.findIndex((s) => s.id === session.id);
  const previous = index > 0 ? sessions[index - 1] : null;
  const next = index >= 0 && index < sessions.length - 1 ? sessions[index + 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Percorso" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mist-400">
        <Link href="/calendario" className="hover:text-white">
          Calendario
        </Link>
        <span>/</span>
        <Link href={`/giorno/${session.date}`} className="hover:text-white">
          {humanDate(session.date)}
        </Link>
        <span>/</span>
        <span className="text-mist-300">{session.courseShort}</span>
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
            {timeOf(session.start)}–{timeOf(session.end)}
          </span>
          <span className="chip bg-white/5 text-mist-300 ring-white/10">Lezione {session.lessonNumber}/{session.totalLessons}</span>
          {session.label && <span className="chip bg-violet-500/15 text-violet-300 ring-violet-500/30">{session.label}</span>}
          {session.date === today && <span className="chip bg-brand-500/20 text-brand-300 ring-brand-400/40">Oggi</span>}
          {files.length > 0 ? (
            <span className="chip bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
              {files.length} {files.length === 1 ? "materiale" : "materiali"}
            </span>
          ) : (
            <span className="chip bg-white/4 text-mist-400 ring-white/8">nessun materiale</span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
          <Link href={`/corsi/${session.courseSlug}`} className="underline-offset-4 hover:underline">
            {session.courseName}
          </Link>
        </h1>
        <p className="mt-1 text-sm text-mist-300">
          {humanDate(session.date)} · {session.room}
        </p>
        <p className="text-sm text-mist-400">{session.professors.join(", ")}</p>
      </header>

      <div className="mt-6">
        <LessonPanel
          sessionId={session.id}
          files={files}
          uploadsEnabled={uploadsEnabled}
          isAdmin={isAdmin}
          sessionLabel={`${humanDate(session.date)}, ${timeOf(session.start)}`}
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-white/8 pt-4">
        {previous ? (
          <Link href={`/lezione/${previous.id}`} className="btn-ghost max-w-full text-xs">
            <span className="truncate">← {previous.courseShort} · {previous.date.split("-").reverse().slice(0, 2).join("/")}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/lezione/${next.id}`} className="btn-ghost max-w-full text-xs">
            <span className="truncate">{next.courseShort} · {next.date.split("-").reverse().slice(0, 2).join("/")} →</span>
          </Link>
        ) : (
          <span />
        )}
      </div>

      {sameDay.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-mist-400">
            Altre lezioni del {session.date.split("-").reverse().slice(0, 2).join("/")}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {sameDay.map((other) => (
              <li key={other.id}>
                <Link
                  href={`/lezione/${other.id}`}
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-ink-950/40 px-3 py-2 text-xs transition-colors hover:border-white/16 hover:bg-white/5"
                >
                  <span className="tabular-nums text-mist-400">{timeOf(other.start)}</span>
                  <span className="min-w-0 flex-1 truncate text-mist-200">{other.courseName}</span>
                  <span aria-hidden className="text-mist-400">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
