export type Semester = 1 | 2;
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type Area = "giuridico" | "economico" | "storico-politico" | "lingue" | "altro";
export type CurriculumSlug = "giuridico" | "storico-politico" | "economico";

export interface Slot {
  day: Weekday;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  room: string;
  label?: string; // e.g. "Esercitazione"
}

export interface Exception {
  date: string; // YYYY-MM-DD
  kind: "cancelled" | "moved";
  reason: string;
}

export interface ExtraSession {
  date: string;
  day: Weekday;
  start: string;
  end: string;
  room: string;
}

export interface RawCourse {
  id: string;
  name: string;
  short: string;
  professors: string[];
  year: 0 | 1 | 2 | 3; // 0 = elective (insegnamento a scelta)
  curriculum?: string;
  cfu: number;
  code?: string;
  area: Area;
  semester: Semester;
  /** first lesson date; defaults to semester start */
  start?: string;
  note?: string;
  schedule: Slot[];
  exceptions?: Exception[];
  extraSessions?: ExtraSession[];
}

export interface Course extends RawCourse {
  slug: string;
  yearLabel: string;
  sessions: LessonSession[];
}

export interface LessonSession {
  /** stable, URL-safe id: `<courseId>-<YYYY-MM-DD>-<HHMM>` */
  id: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  courseShort: string;
  year: number;
  curriculum?: string;
  professors: string[];
  semester: Semester;
  /** ISO date (Europe/Rome) */
  date: string;
  /** ISO datetime with +02:00/+01:00 offset — never interpreted as server-local time */
  start: string;
  end: string;
  room: string;
  label?: string;
  lessonNumber: number;
  totalLessons: number;
}

export interface FileRecord {
  /** storage key inside the bucket, e.g. sari/sessions/<sessionId>/<uuid>__<name>.pdf */
  key: string;
  sessionId: string;
  courseId: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy?: string;
  note?: string;
  hidden?: boolean;
}

export interface SessionWithFiles extends LessonSession {
  files: FileRecord[];
  fileCount: number;
  totalBytes: number;
}
