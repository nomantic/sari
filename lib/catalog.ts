import { courses } from "./courses";
import { buildSessions } from "./schedule";
import type { Course, LessonSession } from "./types";

let cache: { courses: Course[]; sessions: LessonSession[] } | null = null;

/**
 * Courses decorated with their session ids, and the global chronological list
 * of every lesson of the academic year. Computed once per server process.
 */
export function getCatalog() {
  if (!cache) {
    const sessions = buildSessions(courses);
    const byCourse = new Map<string, LessonSession[]>();
    for (const s of sessions) {
      const list = byCourse.get(s.courseId) ?? [];
      list.push(s);
      byCourse.set(s.courseId, list);
    }
    const decorated: Course[] = courses.map((c) => ({
      ...c,
      slug: c.id,
      yearLabel:
        c.year === 0
          ? "Insegnamenti a scelta"
          : c.year === 1
            ? "Primo anno"
            : c.year === 2
              ? "Secondo anno"
              : "Terzo anno",
      sessions: byCourse.get(c.id) ?? [],
    }));
    cache = { courses: decorated, sessions };
  }
  return cache;
}

export function getCourse(slug: string): Course | undefined {
  return getCatalog().courses.find((c) => c.slug === slug);
}

export function getSession(id: string): LessonSession | undefined {
  return getCatalog().sessions.find((s) => s.id === id);
}
