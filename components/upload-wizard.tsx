"use client";

import { useMemo, useState } from "react";
import { Uploader } from "./uploader";
import type { LessonSession } from "@/lib/types";

interface CourseOption {
  id: string;
  name: string;
  short: string;
  professors: string[];
  year: number;
  sessions: LessonSession[];
}

interface Props {
  courses: CourseOption[];
  yearLabels: Record<number, string>;
  defaultCourse?: string;
  today: string;
  uploadsEnabled: boolean;
  onUploaded?: () => void;
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function label(session: LessonSession): string {
  const [y, m, d] = session.date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d} ${MONTHS[m - 1]} ${y} · ${session.start.slice(11, 16)}–${session.end.slice(11, 16)}`;
}

export function UploadWizard({ courses, yearLabels, defaultCourse, today, uploadsEnabled, onUploaded }: Props) {
  const [courseId, setCourseId] = useState(defaultCourse ?? "");
  const [sessionId, setSessionId] = useState("");
  const [query, setQuery] = useState("");
  const [showPast, setShowPast] = useState(false);

  const course = courses.find((c) => c.id === courseId);

  const sessionOptions = useMemo(() => {
    if (!course) return [];
    const list = showPast ? course.sessions : course.sessions.filter((s) => s.date >= today);
    // A lesson stays uploadable for a while after it happens; past lessons are
    // behind the toggle so the common case is short.
    return list;
  }, [course, showPast, today]);

  const session = course?.sessions.find((s) => s.id === sessionId);
  const isExam = sessionId === `exam:${courseId}` && Boolean(course);
  const targetLabel = isExam
    ? `materiali d'esame di ${course!.name}`
    : session
      ? label(session)
      : null;

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-xs font-medium">
        {[
          { n: 1, label: "Materia", done: Boolean(course) },
          { n: 2, label: "Data e ora / esame", done: Boolean(session) || isExam },
          { n: 3, label: "File", done: false },
        ].map((step) => (
          <li key={step.n} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                step.done ? "bg-emerald-500 text-strong" : "border border-line-strong bg-surface text-muted"
              }`}
            >
              {step.done ? "✓" : step.n}
            </span>
            <span className={step.done ? "text-strong" : "text-faint"}>{step.label}</span>
            {step.n < 3 && <span className="mx-1 h-px w-6 bg-white/15" aria-hidden />}
          </li>
        ))}
      </ol>

      <section className="surface p-4">
        <h2 className="text-sm font-semibold text-strong">1 · Quale materia?</h2>
        <input
          type="search"
          className="input mt-2"
          placeholder="Cerca una materia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca materia"
        />
        <div className="scroll-thin mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {courses
            .filter((c) => {
              const q = query.trim().toLowerCase();
              if (!q) return true;
              return `${c.name} ${c.short} ${c.professors.join(" ")}`.toLowerCase().includes(q);
            })
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCourseId(c.id);
                  setSessionId("");
                }}
                className={`block w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  courseId === c.id
                    ? "border-brand-400/60 bg-brand-500/15"
                    : "border-line bg-surface-2 hover:border-line-strong hover:bg-surface-2"
                }`}
              >
                <span className="block text-sm font-medium text-strong">{c.name}</span>
                <span className="mt-0.5 block text-[11px] text-faint">
                  {yearLabels[c.year]} · {c.professors.join(", ")} · {c.sessions.length} lezioni
                </span>
              </button>
            ))}
        </div>
      </section>

      {course && (
        <section className="surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-strong">2 · Quale lezione?</h2>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
              includi lezioni passate
            </label>
          </div>
          <select
            className="input mt-2"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            aria-label="Scegli la lezione per data e ora, oppure i materiali d'esame"
          >
            <option value="">— Scegli data e ora —</option>
            <option value={`exam:${course.id}`}>🎓 Materiali d&apos;esame (per tutta la materia)</option>
            {sessionOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)} — {s.room}
              </option>
            ))}
          </select>
          {sessionOptions.length === 0 && (
            <p className="mt-2 text-xs text-faint">
              Nessuna lezione futura per questa materia. Attiva «includi lezioni passate» per caricare materiali di una
              lezione già svolta.
            </p>
          )}
          {session && (
            <div className="mt-3 rounded-xl border border-brand-400/30 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
              Stai caricando materiali per la lezione del{" "}
              <strong className="text-strong">{label(session)}</strong> ({session.room}).
            </div>
          )}
          {isExam && (
            <div className="mt-3 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-xs text-gold-400">
              Stai caricando <strong className="text-strong">materiali d&apos;esame</strong> per tutta la materia: slide
              complete, riassunti, prove passate.
            </div>
          )}
        </section>
      )}

      <section className="surface p-4">
        <h2 className="text-sm font-semibold text-strong">3 · Carica i file</h2>
        <div className="mt-3">
          {sessionId && targetLabel ? (
            <Uploader sessionId={sessionId} sessionLabel={targetLabel} disabled={!uploadsEnabled} onUploaded={onUploaded} />
          ) : (
            <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-faint">
              Scegli prima la materia e la destinazione (lezione o materiali d&apos;esame).
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
