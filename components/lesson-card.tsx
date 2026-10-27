"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Uploader } from "./uploader";
import { FileList } from "./file-list";
import type { FileRecord, LessonSession } from "@/lib/types";

interface Props {
  session: LessonSession;
  files: FileRecord[];
  uploadsEnabled: boolean;
  defaultOpen?: boolean;
  isPast?: boolean;
  isToday?: boolean;
}

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function dateParts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
  return { day: d, month: MONTHS[m - 1], weekday, year: y };
}

function timeOf(isoDateTime: string) {
  return isoDateTime.slice(11, 16);
}

export function LessonCard({ session, files, uploadsEnabled, defaultOpen, isPast, isToday }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const { day, month, weekday } = dateParts(session.date);
  const hasFiles = files.length > 0;

  return (
    <article
      className={`surface overflow-hidden transition-colors ${
        isToday ? "border-brand-400/40 ring-1 ring-brand-400/20" : open ? "border-white/16" : ""
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${
            isToday ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-ink-950/60"
          }`}
        >
          <span className="text-lg font-bold leading-none text-white">{day}</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-mist-400">{month}</span>
          <span className="text-[10px] uppercase tracking-wider text-mist-400">{weekday}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
              {timeOf(session.start)}–{timeOf(session.end)}
            </span>
            <span className="chip bg-white/5 text-mist-300 ring-white/10">
              Lezione {session.lessonNumber}/{session.totalLessons}
            </span>
            {session.label && <span className="chip bg-violet-500/15 text-violet-300 ring-violet-500/30">{session.label}</span>}
            {isToday && <span className="chip bg-brand-500/20 text-brand-300 ring-brand-400/40">Oggi</span>}
            {hasFiles ? (
              <span className="chip bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
                {files.length} {files.length === 1 ? "materiale" : "materiali"}
              </span>
            ) : (
              <span className="chip bg-white/4 text-mist-400 ring-white/8">Nessun materiale</span>
            )}
          </div>

          <Link
            href={`/corsi/${session.courseSlug}#${session.id}`}
            className="mt-1.5 block truncate text-sm font-semibold text-white underline-offset-4 hover:underline"
          >
            {session.courseName}
          </Link>
          <p className="mt-0.5 truncate text-xs text-mist-400">
            {session.professors.join(", ")} · {session.room}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={open ? "btn-ghost" : "btn-primary"}
            aria-expanded={open}
            aria-controls={`panel-${session.id}`}
          >
            {open ? "Chiudi" : hasFiles ? "Apri materiali" : isPast ? "Carica" : "Materiali"}
          </button>
        </div>
      </div>

      {open && (
        <div id={`panel-${session.id}`} className="border-t border-white/8 bg-ink-950/40 p-4">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section aria-label="Materiali della lezione" className="order-2 lg:order-1">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist-400">
                Materiali condivisi ({files.length})
              </h3>
              <FileList files={files} />
            </section>
            <section aria-labelledby={`upload-${session.id}`} className="order-1 lg:order-2">
              <h3 id={`upload-${session.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist-400">
                Carica per questa lezione
              </h3>
              <Uploader
                sessionId={session.id}
                sessionLabel={`${weekday} ${day} ${month}, ${timeOf(session.start)}`}
                disabled={!uploadsEnabled}
                onUploaded={() => router.refresh()}
              />
            </section>
          </div>
        </div>
      )}
    </article>
  );
}
