"use client";

import Link from "next/link";
import type { FileRecord, LessonSession } from "@/lib/types";

interface Props {
  session: LessonSession;
  files: FileRecord[];
  isPast?: boolean;
  isToday?: boolean;
  /** Compact rows are used where space is tight (e.g. a day's list). */
  dense?: boolean;
}

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function dateParts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
  return { day: d, month: MONTHS[m - 1], weekday };
}

function timeOf(isoDateTime: string) {
  return isoDateTime.slice(11, 16);
}

/**
 * One lesson = one link to its own page. Nothing opens inline: the whole card
 * is the target, so there is only ever one obvious action.
 */
export function LessonCard({ session, files, isPast, isToday, dense }: Props) {
  const { day, month, weekday } = dateParts(session.date);
  const hasFiles = files.length > 0;

  return (
    <Link
      href={`/lezione/${session.id}`}
      className={`surface card-hover group flex w-full min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4 ${
        isToday ? "border-brand-400/40 ring-1 ring-brand-400/20" : ""
      }`}
      aria-label={`${session.courseName}, ${session.date} ${timeOf(session.start)}, ${files.length} materiali`}
    >
      {!dense && (
        <span
          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${
            isToday ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-ink-950/60"
          }`}
        >
          <span className="text-base font-bold leading-none text-white">{day}</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-mist-400">{month}</span>
          <span className="text-[10px] uppercase tracking-wider text-mist-400">{weekday}</span>
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {timeOf(session.start)}–{timeOf(session.end)}
          </span>
          {session.label && (
            <span className="chip bg-violet-500/15 text-violet-300 ring-violet-500/30">{session.label}</span>
          )}
          {isToday && <span className="chip bg-brand-500/20 text-brand-300 ring-brand-400/40">Oggi</span>}
          {hasFiles ? (
            <span className="chip bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
              {files.length} {files.length === 1 ? "materiale" : "materiali"}
            </span>
          ) : (
            <span className="chip bg-white/4 text-mist-400 ring-white/8">nessun materiale</span>
          )}
        </span>

        <span className="mt-1 block truncate text-sm font-semibold text-white group-hover:underline group-hover:underline-offset-4">
          {session.courseName}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-mist-400">
          {session.professors.join(", ")} · {session.room}
          {isPast ? "" : ""}
        </span>
      </span>

      <span className="shrink-0 text-mist-400 transition-colors group-hover:text-white" aria-hidden>
        →
      </span>
    </Link>
  );
}
