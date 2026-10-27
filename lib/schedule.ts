import { SEMESTERS } from "./constants";
import type { LessonSession, RawCourse, Semester, Weekday } from "./types";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const DAY_INDEX: Record<Weekday, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
};

/** Parse YYYY-MM-DD into a UTC noon Date so date maths never shifts across DST. */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Europe/Rome is UTC+2 during summer time and UTC+1 in winter.
 * Last Sunday of March → last Sunday of October. Computed so lesson timestamps
 * are always explicit and never depend on the server's local timezone.
 */
export function romeOffset(dateIso: string): "+01:00" | "+02:00" {
  const year = Number(dateIso.slice(0, 4));
  const y = year;
  const lastSunday = (year: number, monthIndex: number) => {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0, 12));
    return last.getUTCDate() - last.getUTCDay();
  };
  const dstStart = `${y}-${String(3).padStart(2, "0")}-${String(lastSunday(y, 2)).padStart(2, "0")}`;
  const dstEnd = `${y}-${String(10).padStart(2, "0")}-${String(lastSunday(y, 9)).padStart(2, "0")}`;
  return dateIso >= dstStart && dateIso < dstEnd ? "+02:00" : "+01:00";
}

export function isoDateTime(dateIso: string, time: string): string {
  return `${dateIso}T${time}:00${romeOffset(dateIso)}`;
}

/** "YYYY-MM-DD" + "HH:MM" → numeric sortable key "YYYYMMDDHHMM". */
export function sessionSortKey(dateIso: string, time: string): string {
  return dateIso.replace(/-/g, "") + time.replace(":", "");
}

export function buildSessions(courses: RawCourse[]): LessonSession[] {
  const all: LessonSession[] = [];
  type Draft = Omit<LessonSession, "lessonNumber" | "totalLessons">;

  for (const course of courses) {
    const range = SEMESTERS[course.semester as Semester];
    const start = course.start && course.start > range.start ? course.start : range.start;
    const end = range.end;
    const slotsByDay = new Map<number, RawCourse["schedule"]>();
    for (const slot of course.schedule) {
      const key = DAY_INDEX[slot.day];
      const list = slotsByDay.get(key) ?? [];
      list.push(slot);
      slotsByDay.set(key, list);
    }

    const raw: Draft[] = [];

    for (let cursor = parseDate(start); toIso(cursor) <= end; cursor = addDays(cursor, 1)) {
      const slots = slotsByDay.get(cursor.getUTCDay());
      if (!slots) continue;
      const date = toIso(cursor);
      const cancelled = course.exceptions?.find((e) => e.date === date && e.kind === "cancelled");
      if (cancelled) continue;
      for (const slot of slots) {
        raw.push({
          id: `${course.id}-${date}-${slot.start.replace(":", "")}`,
          courseId: course.id,
          courseSlug: course.id,
          courseName: course.name,
          courseShort: course.short,
          year: course.year,
          curriculum: course.curriculum,
          professors: course.professors,
          semester: course.semester,
          date,
          start: isoDateTime(date, slot.start),
          end: isoDateTime(date, slot.end),
          room: slot.room,
          label: slot.label,
        });
      }
    }

    for (const extra of course.extraSessions ?? []) {
      raw.push({
        id: `${course.id}-${extra.date}-${extra.start.replace(":", "")}`,
        courseId: course.id,
        courseSlug: course.id,
        courseName: course.name,
        courseShort: course.short,
        year: course.year,
        curriculum: course.curriculum,
        professors: course.professors,
        semester: course.semester,
        date: extra.date,
        start: isoDateTime(extra.date, extra.start),
        end: isoDateTime(extra.date, extra.end),
        room: extra.room,
        label: "Lezione aggiuntiva",
      });
    }

    raw.sort(
      (a, b) =>
        sessionSortKey(a.date, a.start.slice(11, 16)).localeCompare(sessionSortKey(b.date, b.start.slice(11, 16))) ||
        a.id.localeCompare(b.id),
    );

    raw.forEach((session, index) => {
      all.push({ ...session, lessonNumber: index + 1, totalLessons: raw.length });
    });
  }

  return all.sort(
    (a, b) => sessionSortKey(a.date, a.start.slice(11, 16)).localeCompare(sessionSortKey(b.date, b.start.slice(11, 16))) || a.id.localeCompare(b.id),
  );
}

export function weekdayName(iso: string): (typeof WEEKDAYS)[number] {
  return WEEKDAYS[parseDate(iso).getUTCDay()];
}


