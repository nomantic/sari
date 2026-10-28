"use client";

import { useRouter } from "next/navigation";
import { Uploader } from "./uploader";
import { FileList } from "./file-list";
import type { FileRecord } from "@/lib/types";
import { formatBytes } from "@/lib/format";

interface Props {
  courseId: string;
  courseName: string;
  files: FileRecord[];
  uploadsEnabled: boolean;
  isAdmin?: boolean;
  /** Statistic strip shown inside the panel (lesson coverage etc.). */
  stats?: Array<{ label: string; value: string }>;
}

/**
 * Course-level container for everything needed to prepare an exam: slides from
 * all lessons, past papers, summaries. Same upload/download/delete rules as
 * lesson material — the only difference is that it is not tied to a date.
 */
export function ExamMaterials({ courseId, courseName, files, uploadsEnabled, stats, isAdmin }: Props) {
  const router = useRouter();
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <section
      id="materiali-esame"
      className="surface scroll-mt-24 overflow-hidden border-gold-400/25 bg-gradient-to-br from-gold-400/10 to-transparent"
      aria-labelledby="materiali-esame-title"
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/15 text-lg sm:h-12 sm:w-12 sm:text-xl" aria-hidden>
          🎓
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="materiali-esame-title" className="text-base font-semibold text-strong">
              Materiali d&apos;esame
            </h2>
            <span className="chip bg-gold-400/15 text-gold-400 ring-gold-400/30">Per tutta la materia</span>
            {files.length > 0 && (
              <span className="chip bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
                {files.length} {files.length === 1 ? "file" : "file"} · {formatBytes(totalBytes)}
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Tutto ciò che serve per l&apos;esame di <strong className="text-strong">{courseName}</strong>: slide complete,
            riassunti, prove d&apos;esame passate, domande frequenti. Non legato a una singola lezione.
          </p>

          {stats && stats.length > 0 && (
            /* One line per stat on phones, three columns from sm up: the same
               rhythm as the course page above it. */
            <dl className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 sm:block"
                >
                  <dt className="text-[10px] uppercase tracking-wider text-faint">{stat.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-strong">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className="grid gap-5 border-t border-line bg-surface-2 p-4 sm:p-5 lg:grid-cols-[1fr_320px]">
        <section aria-label="File per l'esame" className="order-2 lg:order-1">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
            File disponibili ({files.length})
          </h3>
          <FileList
            files={files}
            isAdmin={isAdmin}
            emptyHint="Nessun file per l'esame ancora. Carica per primo riassunti, prove passate o le slide complete del corso."
          />
        </section>
        <section aria-labelledby="carica-esame" className="order-1 lg:order-2">
          <h3 id="carica-esame" className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
            Carica per l&apos;esame
          </h3>
          <Uploader
            sessionId={`exam:${courseId}`}
            sessionLabel={`l'esame di ${courseName}`}
            disabled={!uploadsEnabled}
            onUploaded={() => router.refresh()}
          />
        </section>
      </div>
    </section>
  );
}
