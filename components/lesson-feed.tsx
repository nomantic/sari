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
}

const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function monthHeading(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export function LessonFeed({ entries, uploadsEnabled, today, yearLabels }: Props) {
  const [year, setYear] = useState<string>("all");
  const [showPast, setShowPast] = useState(false);
  const [onlyWithFiles, setOnlyWithFiles] = useState(false);
  const [limit, setLimit] = useState(40);

  const filtered = useMemo(() => {
    return entries.filter(({ session, files }) => {
      if (!showPast && session.date < today) return false;
      if (year !== "all" && String(session.year) !== year) return false;
      if (onlyWithFiles && files.length === 0) return false;
      return true;
    });
  }, [entries, year, showPast, onlyWithFiles, today]);

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

  // With a single year in scope the year filter is noise: only show it when the
  // catalog actually spans more than one year (or includes electives).
  const availableYears = Array.from(new Set(entries.map((e) => e.session.year))).sort((a, b) => {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return a - b;
  });

  return (
    <div className="space-y-6">
      <div className="surface sticky top-16 z-30 -mx-1 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-mist-300">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
            Mostra anche le lezioni passate
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={onlyWithFiles} onChange={(e) => setOnlyWithFiles(e.target.checked)} />
            Solo con materiali
          </label>
          {availableYears.length > 1 && (
            <select
              className="rounded-lg border border-white/10 bg-ink-950/60 px-2 py-1 text-xs text-mist-200"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Filtra per anno"
            >
              <option value="all">Tutti gli anni</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  {yearLabels[y]}
                </option>
              ))}
            </select>
          )}
          <span className="ml-auto tabular-nums text-mist-400">
            {filtered.length} {filtered.length === 1 ? "lezione" : "lezioni"}
          </span>
        </div>
      </div>

      {grouped.length === 0 && (
        <p className="surface p-10 text-center text-sm text-mist-400">
          {entries.length === 0
            ? "Nessuna lezione in calendario per il periodo attivo."
            : "Nessuna lezione trovata con questi filtri."}
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

