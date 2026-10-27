import type { RawCourse } from "./types";

/**
 * Which part of the calendar is live in the app right now.
 *
 * The full A.A. 2026/2027 timetable (52 courses, both semesters) stays in
 * `lib/courses.ts` and is never thrown away — this switch only decides what the
 * site shows. Right now the app serves the **first year, first semester**; the
 * rest comes back by changing the fields below.
 *
 * To widen the scope later, for example:
 *   year: null                      → every year
 *   semester: null                  → both semesters
 *   year: 1, semester: null         → whole first year
 */
export interface Scope {
  /** `null` = all years; `0` = elective courses only. */
  year: number | null;
  /** `null` = both semesters. */
  semester: 1 | 2 | null;
  /** Human-readable description shown in the UI. */
  label: string;
  /** Shown when a course has no lessons inside the scope. */
  emptyHint: string;
}

export const ACTIVE_SCOPE: Scope = {
  year: 1,
  semester: 1,
  label: "Primo anno · I semestre",
  emptyHint: "Questa materia non si tiene nel primo semestre del primo anno.",
};

export function isInScope(course: RawCourse, scope: Scope = ACTIVE_SCOPE): boolean {
  if (scope.year !== null && course.year !== scope.year) return false;
  if (scope.semester !== null && course.semester !== scope.semester) return false;
  return true;
}

export function scopeCourses(courses: RawCourse[], scope: Scope = ACTIVE_SCOPE): RawCourse[] {
  return courses.filter((course) => isInScope(course, scope));
}
