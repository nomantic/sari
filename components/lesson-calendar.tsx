"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FileRecord, LessonSession } from "@/lib/types";

interface Entry {
  session: LessonSession;
  files: FileRecord[];
}

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** ISO date (YYYY-MM-DD) → { year, monthIndex0, day } without timezone maths. */
function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, monthIndex0: m - 1, day: d };
}

function isoOf(year: number, monthIndex0: number, day: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Monday-first weekday index (0 = Monday … 6 = Sunday). */
function weekdayMondayFirst(year: number, monthIndex0: number, day: number): number {
  const js = new Date(Date.UTC(year, monthIndex0, day, 12)).getUTCDay(); // 0 = Sunday
  return (js + 6) % 7;
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function humanDate(iso: string): string {
  const { year, monthIndex0, day } = parts(iso);
  const weekdays = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const js = new Date(Date.UTC(year, monthIndex0, day, 12)).getUTCDay();
  return `${weekdays[js]} ${day} ${MONTHS[monthIndex0].toLowerCase()} ${year}`;
}

function timeOf(isoDateTime: string): string {
  return isoDateTime.slice(11, 16);
}

/** Distinct semester labels present in a month, for the little legend. */
function monthLabel(year: number, monthIndex0: number): string {
  return `${MONTHS[monthIndex0]} ${year}`;
}

export function LessonCalendar({
  entries,
  today,
  defaultMonth,
}: {
  entries: Entry[];
  today: string;
  /** "YYYY-MM" to open on; defaults to today's month. */
  defaultMonth?: string;
}) {
  const initial = defaultMonth ?? today.slice(0, 7);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = initial.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [selected, setSelected] = useState<string | null>(null);

  // Group lessons by calendar date once; this is the calendar's whole index.
  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const list = map.get(entry.session.date) ?? [];
      list.push(entry);
      map.set(entry.session.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.session.start.localeCompare(b.session.start));
    }
    return map;
  }, [entries]);

  const countsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const [date, list] of byDate) {
      const key = date.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + list.length);
    }
    return map;
  }, [byDate]);

  const firstWeekday = weekdayMondayFirst(cursor.year, cursor.month, 1);
  const total = daysInMonth(cursor.year, cursor.month);
  const cells: Array<{ date: string; day: number } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, i) => ({ date: isoOf(cursor.year, cursor.month, i + 1), day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    const next = cursor.month + delta;
    const year = cursor.year + Math.floor(next / 12);
    const month = ((next % 12) + 12) % 12;
    setCursor({ year, month });
  }

  function goToday() {
    const { year, monthIndex0 } = parts(today);
    setCursor({ year, month: monthIndex0 });
    setSelected(today);
  }

  const selectedEntries = selected ? (byDate.get(selected) ?? []) : [];
  const monthLessons = countsByMonth.get(isoOf(cursor.year, cursor.month, 1).slice(0, 7)) ?? 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* ─────────── month grid ─────────── */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-mist-300 transition-colors hover:bg-white/8 hover:text-white"
              aria-label="Mese precedente"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-mist-300 transition-colors hover:bg-white/8 hover:text-white"
              aria-label="Mese successivo"
            >
              ›
            </button>
          </div>
          <h3 className="text-sm font-semibold text-white" aria-live="polite">
            {monthLabel(cursor.year, cursor.month)}
            <span className="ml-2 text-[11px] font-normal text-mist-400">{monthLessons} lezioni</span>
          </h3>
          <button type="button" className="rounded-lg px-2 py-1 text-[11px] text-mist-300 hover:bg-white/8 hover:text-white" onClick={goToday}>
            Oggi
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-white/8 bg-ink-950/40">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-mist-400">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-white/8">
          {cells.map((cell, index) => {
            if (!cell) return <div key={`e-${index}`} className="min-h-16 bg-ink-900/40" />;
            const lessons = byDate.get(cell.date) ?? [];
            const isToday = cell.date === today;
            const isSelected = cell.date === selected;
            const withFiles = lessons.filter((e) => e.files.length > 0).length;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(isSelected ? null : cell.date)}
                aria-pressed={isSelected}
                aria-label={`${humanDate(cell.date)}: ${lessons.length} ${lessons.length === 1 ? "lezione" : "lezioni"}`}
                className={`relative flex min-h-16 flex-col items-start gap-1 p-1.5 text-left transition-colors sm:min-h-20 ${
                  isSelected
                    ? "bg-brand-500/25 ring-2 ring-inset ring-brand-400"
                    : isToday
                      ? "bg-brand-500/10"
                      : "bg-ink-900/60 hover:bg-white/6"
                } ${lessons.length === 0 ? "cursor-default" : ""}`}
              >
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    isToday ? "grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white" : "text-mist-200"
                  }`}
                >
                  {cell.day}
                </span>

                {lessons.length > 0 && (
                  <>
                    {/* On phones only a dot+count; the names would not fit. */}
                    <span className="flex items-center gap-1 sm:hidden">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                      <span className="text-[10px] tabular-nums text-mist-300">{lessons.length}</span>
                    </span>
                    <span className="hidden w-full space-y-0.5 sm:block">
                      {lessons.slice(0, 2).map((entry) => (
                        <span
                          key={entry.session.id}
                          className="block truncate rounded bg-white/8 px-1 py-0.5 text-[10px] leading-tight text-mist-200"
                        >
                          <span className="tabular-nums text-brand-300">{timeOf(entry.session.start)}</span>{" "}
                          {entry.session.courseShort}
                        </span>
                      ))}
                      {lessons.length > 2 && (
                        <span className="block text-[10px] text-mist-400">+{lessons.length - 2}</span>
                      )}
                    </span>
                  </>
                )}

                {withFiles > 0 && (
                  <span
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400"
                    title={`${withFiles} con materiali`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-[10px] text-mist-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> lezioni
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> con materiali
          </span>
          <span>Clicca un giorno per vedere le lezioni.</span>
        </div>
      </div>

      {/* ─────────── selected day ─────────── */}
      <aside className="surface flex flex-col overflow-hidden" aria-live="polite">
        {!selected ? (
          <div className="p-6 text-center">
            <p className="text-2xl" aria-hidden>
              📅
            </p>
            <p className="mt-2 text-sm font-semibold text-white">Scegli un giorno</p>
            <p className="mt-1 text-xs text-mist-400">
              Clicca su un giorno del calendario per vedere le lezioni e aprire i materiali.
            </p>
            {byDate.has(today) && (
              <button type="button" className="btn-ghost mt-4 text-xs" onClick={() => setSelected(today)}>
                Mostra le lezioni di oggi
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-white/8 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-white">{humanDate(selected)}</p>
                <p className="text-[11px] text-mist-400">
                  {selectedEntries.length} {selectedEntries.length === 1 ? "lezione" : "lezioni"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-[11px] text-mist-400 hover:text-white"
                onClick={() => setSelected(null)}
                aria-label="Chiudi il giorno selezionato"
              >
                ✕
              </button>
            </div>

            {selectedEntries.length === 0 ? (
              <p className="p-5 text-center text-xs text-mist-400">Nessuna lezione in questa data.</p>
            ) : (
              <ul className="divide-y divide-white/8">
                {selectedEntries.map(({ session, files }) => (
                  <li key={session.id} className="p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="rounded bg-white/8 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                        {timeOf(session.start)}–{timeOf(session.end)}
                      </span>
                      {files.length > 0 ? (
                        <span className="chip bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
                          {files.length} material{files.length === 1 ? "e" : "i"}
                        </span>
                      ) : (
                        <span className="chip bg-white/4 text-mist-400 ring-white/8">vuota</span>
                      )}
                    </div>
                    <Link
                      href={`/corsi/${session.courseSlug}#${session.id}`}
                      className="mt-1.5 block text-sm font-medium text-white underline-offset-4 hover:underline"
                    >
                      {session.courseName}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-mist-400">
                      {session.professors.join(", ")} · {session.room}
                    </p>
                    {files.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {files.slice(0, 3).map((file) => (
                          <li key={file.key}>
                            <a
                              href={`/api/files/download?key=${encodeURIComponent(file.key)}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="block truncate text-[11px] text-mist-300 underline-offset-2 hover:text-white hover:underline"
                            >
                              ↳ {file.name}
                            </a>
                          </li>
                        ))}
                        {files.length > 3 && (
                          <li className="text-[11px] text-mist-400">
                            <Link href={`/corsi/${session.courseSlug}#${session.id}`} className="hover:text-white">
                              e altri {files.length - 3}…
                            </Link>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

/** Compact strip of the next few days with lessons, shown above the calendar. */
export function UpcomingStrip({ entries, today, days = 7 }: { entries: Entry[]; today: string; days?: number }) {
  const upcoming = useMemo(() => {
    const byDate = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.session.date < today) continue;
      const list = byDate.get(entry.session.date) ?? [];
      list.push(entry);
      byDate.set(entry.session.date, list);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, days);
  }, [entries, today, days]);

  if (!upcoming.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scroll-thin">
      {upcoming.map(([date, list]) => (
        <div
          key={date}
          className="min-w-32 shrink-0 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-2"
        >
          <p className="text-[10px] uppercase tracking-wider text-mist-400">{humanDate(date).split(" ")[0]}</p>
          <p className="text-sm font-semibold text-white">{parts(date).day} {MONTHS[parts(date).monthIndex0].slice(0, 3)}</p>
          <p className="text-[11px] text-mist-400">
            {list.length} {list.length === 1 ? "lezione" : "lezioni"}
          </p>
        </div>
      ))}
    </div>
  );
}
