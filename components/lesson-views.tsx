"use client";

import { useState } from "react";
import { LessonCalendar } from "./lesson-calendar";
import { LessonFeed } from "./lesson-feed";
import type { FileRecord, LessonSession } from "@/lib/types";

interface Entry {
  session: LessonSession;
  files: FileRecord[];
}

/**
 * Home page switch between the chronological list and the month calendar.
 * Both views get the same data, so switching is instant and needs no request.
 */
export function LessonViews({
  entries,
  today,
  yearLabels,
}: {
  entries: Entry[];
  today: string;
  yearLabels: Record<number, string>;
}) {
  const [view, setView] = useState<"calendario" | "elenco">("calendario");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
        {(
          [
            { key: "calendario", label: "Calendario" },
            { key: "elenco", label: "Elenco cronologico" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setView(option.key)}
            aria-pressed={view === option.key}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === option.key ? "bg-brand-500 text-strong" : "text-muted hover:bg-surface-2 hover:text-strong"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "calendario" ? (
        <LessonCalendar entries={entries} today={today} />
      ) : (
        <LessonFeed entries={entries} today={today} yearLabels={yearLabels} />
      )}
    </div>
  );
}
