"use client";

import { useMemo, useState } from "react";
import { LessonCard } from "@/components/lesson-card";
import type { FileRecord, LessonSession } from "@/lib/types";

interface Entry {
  session: LessonSession;
  files: FileRecord[];
}

interface Props {
  entries: Entry[];
  uploadsEnabled: boolean;
  today: string;
  yearLabels: Record<number, string>;
  curriculumLabels: Record<string, string>;
}

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function monthHeading(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export function LessonFeed({ entries, uploadsEnabled, today, yearLabels, curriculumLabels }: Props) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<string>("all");
  const [showPast, setShowPast] = useState(false);
  const [onlyWithFiles, setOnlyWithFiles] = useState(false);
  const [limit, setLimit] = useState(40);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(({ session, files }) => {
      if (!showPast && session.date < today) return false;
      if (year !== "all" && String(session.year) !== year) return false;
      if (onlyWithFiles && files.length === 0) return false;
      if (!q) return true;
      const haystack = `${session.courseName} ${session.courseShort} ${session.professors.join(" ")} ${session.room} ${session.date}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, query, year, showPast, onlyWithFiles, today]);

  const visible = filtered.slice(0, limit);
  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of visible) {
      const key = entry.session.date;
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  let lastMonth = "";

  return (
    <div className="space-y-6">
      <div className="surface sticky top-16 z-30 -mx-1 p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" aria-hidden>
              ⌕
            </span>
            <input
              type="search"
              className="input pl-9"
              placeholder="Cerca insegnamento, docente, aula…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(40);
              }}
              aria-label="Cerca lezioni"
            />
          </div>
          <select
            className="input sm:w-52"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Filtra per anno"
          >
            <option value="all">Tutti gli anni</option>
            <option value="1">{yearLabels[1]}</option>
            <option value="2">{yearLabels[2]}</option>
            <option value="3">{yearLabels[3]}</option>
            <option value="0">{yearLabels[0]}</option>
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-mist-300">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
            Mostra anche le lezioni passate
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={onlyWithFiles} onChange={(e) => setOnlyWithFiles(e.target.checked)} />
            Solo con materiali
          </label>
          <span className="ml-auto tabular-nums text-mist-400">
            {filtered.length} {filtered.length === 1 ? "lezione" : "lezioni"}
            {curriculumLabels ? "" : ""}
          </span>
        </div>
      </div>

      {grouped.length === 0 && (
        <p className="surface p-10 text-center text-sm text-mist-400">
          Nessuna lezione trovata con questi filtri.
        </p>
      )}

      <div className="space-y-8">
        {grouped.map(([date, items]) => {
          const month = monthHeading(date);
          const showMonth = month !== lastMonth;
          lastMonth = month;
          return (
            <section key={date} aria-label={`Lezioni del ${date}`} className="space-y-3">
              {showMonth && (
                <h2 className="pt-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-400">{month}</h2>
              )}
              <div className="grid gap-3">
                {items.map(({ session, files }) => (
                  <LessonCard
                    key={session.id}
                    session={session}
                    files={files}
                    uploadsEnabled={uploadsEnabled}
                    isToday={session.date === today}
                    isPast={session.date < today}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {filtered.length > visible.length && (
        <button type="button" className="btn-ghost w-full" onClick={() => setLimit((n) => n + 40)}>
          Mostra altre lezioni ({filtered.length - visible.length} rimanenti)
        </button>
      )}
    </div>
  );
}
