import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonCard } from "@/components/lesson-card";
import { getCatalog } from "@/lib/catalog";
import { todayIso } from "@/lib/format";
import { filesByTarget, isStorageConfigured } from "@/lib/storage";
import type { FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ date: string }>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function parse(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function isValidDate(iso: string): boolean {
  if (!DATE_RE.test(iso)) return false;
  const { y, m, d } = parse(iso);
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= daysInMonth;
}

function humanDate(iso: string): string {
  const { y, m, d } = parse(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]} ${y}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  if (!isValidDate(date)) return { title: "Data non valida" };
  return {
    title: `Lezioni del ${humanDate(date)}`,
    description: `Le lezioni del ${humanDate(date)} con i materiali scaricabili.`,
  };
}

export default async function DayPage({ params }: { params: Params }) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const { sessions } = getCatalog();
  const today = todayIso();
  const lessons = sessions.filter((s) => s.date === date);

  let byTarget = new Map<string, FileRecord[]>();
  if (isStorageConfigured()) {
    try {
      byTarget = await filesByTarget();
    } catch (err) {
      console.error("[giorno] indice materiali non disponibile:", err);
    }
  }

  // Neighbouring days that actually have lessons, for quick navigation.
  const withLessons = Array.from(new Set(sessions.map((s) => s.date))).sort();
  const previousDay = [...withLessons].reverse().find((d) => d < date) ?? null;
  const nextDay = withLessons.find((d) => d > date) ?? null;
  const filesTotal = lessons.reduce((sum, s) => sum + (byTarget.get(s.id)?.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Percorso" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
        <Link href="/calendario" className="hover:text-strong">
          Calendario
        </Link>
        <span>/</span>
        <span className="text-muted">{humanDate(date)}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
            {lessons.length} {lessons.length === 1 ? "lezione" : "lezioni"}
            {filesTotal > 0 ? ` · ${filesTotal} material${filesTotal === 1 ? "e" : "i"}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-bold capitalize tracking-tight text-strong sm:text-4xl">
            {humanDate(date)}
          </h1>
          {date === today && (
            <span className="mt-2 inline-flex rounded-full bg-brand-500/20 px-2.5 py-1 text-[11px] font-semibold text-brand-300 ring-1 ring-inset ring-brand-400/40">
              Oggi
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {previousDay && (
            <Link href={`/giorno/${previousDay}`} className="btn-ghost text-xs" aria-label={`Lezioni precedenti: ${previousDay}`}>
              ← {previousDay.split("-").reverse().slice(0, 2).join("/")}
            </Link>
          )}
          {date !== today && (
            <Link href={`/giorno/${today}`} className="btn-ghost text-xs">
              Oggi
            </Link>
          )}
          {nextDay && (
            <Link href={`/giorno/${nextDay}`} className="btn-ghost text-xs" aria-label={`Lezioni successive: ${nextDay}`}>
              {nextDay.split("-").reverse().slice(0, 2).join("/")} →
            </Link>
          )}
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="surface mt-8 p-10 text-center">
          <p className="text-3xl" aria-hidden>
            🗓️
          </p>
          <p className="mt-2 text-sm font-semibold text-strong">Nessuna lezione in questa data</p>
          <p className="mt-1 text-xs text-faint">
            In questo giorno del calendario non ci sono lezioni del periodo attivo.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/calendario" className="btn-primary text-xs">
              Torna al calendario
            </Link>
            {nextDay && (
              <Link href={`/giorno/${nextDay}`} className="btn-ghost text-xs">
                Prossimo giorno con lezioni
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {lessons.map((session) => (
            <LessonCard
              key={session.id}
              session={session}
              files={byTarget.get(session.id) ?? []}
              isToday={date === today}
              isPast={date < today}
            />
          ))}
        </div>
      )}
    </div>
  );
}
