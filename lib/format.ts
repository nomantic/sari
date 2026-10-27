import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, TIMEZONE } from "./constants";
import { sanitizeFileName } from "./sanitize";
import type { FileRecord, LessonSession } from "./types";



export function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export { sanitizeFileName } from "./sanitize";

export function validateUpload(input: { name: string; size: number; type?: string }): string | null {
  const name = sanitizeFileName(input.name);
  const ext = extensionOf(name);
  if (!ext) return "Il file deve avere un'estensione (es. .pdf, .docx, .pptx).";
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Formato .${ext} non supportato. Ammessi: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  if (input.size <= 0) return "Il file è vuoto.";
  if (input.size > MAX_UPLOAD_BYTES) {
    return `File troppo grande (${formatBytes(input.size)}). Limite: ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

export function objectKeyFor(session: LessonSession, fileName: string): string {
  const safe = sanitizeFileName(fileName);
  const unique = crypto.randomUUID().slice(0, 8);
  return `sari/sessions/${session.id}/${unique}__${safe}`;
}

/** Defense in depth: only keys the app itself could have created are deletable. */
export function isManagedKey(key: string): boolean {
  return /^sari\/sessions\/[a-z0-9\-]+\/[a-f0-9]{8}__[^\\]+$/i.test(key);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

// ───────────────────────── dates (Europe/Rome, deterministic) ─────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("it-IT", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SHORT_DATE_FMT = new Intl.DateTimeFormat("it-IT", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("it-IT", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatLongDate(isoDateTime: string): string {
  return capitalise(DATE_FMT.format(new Date(isoDateTime)));
}

export function formatShortDate(isoDateTime: string): string {
  return SHORT_DATE_FMT.format(new Date(isoDateTime));
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${TIME_FMT.format(new Date(startIso))}–${TIME_FMT.format(new Date(endIso))}`;
}

/** YYYY-MM-DD of a "YYYY-MM-DD" date string (calendar date, no TZ maths). */
export function calendarDate(isoDate: string): string {
  return isoDate;
}

export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function formatMonth(isoDate: string): string {
  return capitalise(
    new Intl.DateTimeFormat("it-IT", { timeZone: TIMEZONE, month: "long", year: "numeric" }).format(
      new Date(`${isoDate.slice(0, 7)}-15T12:00:00+01:00`),
    ),
  );
}

export function capitalise(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function sortFiles(files: FileRecord[]): FileRecord[] {
  return [...files].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function fileTypeBadge(file: FileRecord | string): string {
  const ext = extensionOf(typeof file === "string" ? file : file.name);
  return ext ? ext.toUpperCase() : "FILE";
}

export const fileTypeTone: Record<string, string> = {
  PDF: "bg-red-500/15 text-red-300 ring-red-500/30",
  DOC: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  DOCX: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  PPT: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  PPTX: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  XLS: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  XLSX: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  CSV: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  ZIP: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
};

