import { courses as allCourses } from "./courses";
import { buildSessions } from "./schedule";
import { ACTIVE_SCOPE, scopeCourses } from "./scope";
import type { Course, LessonSession } from "./types";

let cache: { courses: Course[]; sessions: LessonSession[]; hiddenCount: number } | null = null;

/**
 * Courses in the active scope (see `lib/scope.ts`), decorated with their dated
 * lessons, plus the global chronological list of every lesson. Computed once
 * per server process.
 *
 * Uploads are validated against this catalog, so a course outside the scope
 * cannot be written to even by crafting an API request.
 */
export function getCatalog() {
  if (!cache) {
    const inScope = scopeCourses(allCourses);
    const sessions = buildSessions(inScope);
    const byCourse = new Map<string, LessonSession[]>();
    for (const s of sessions) {
      const list = byCourse.get(s.courseId) ?? [];
      list.push(s);
      byCourse.set(s.courseId, list);
    }
    const decorated: Course[] = inScope.map((c) => ({
      ...c,
      slug: c.id,
      yearLabel:
        c.year === 0
          ? "Materie a scelta"
          : c.year === 1
            ? "Primo anno"
            : c.year === 2
              ? "Secondo anno"
              : "Terzo anno",
      sessions: byCourse.get(c.id) ?? [],
    }));
    cache = {
      courses: decorated,
      sessions,
      hiddenCount: allCourses.length - decorated.length,
    };
  }
  return cache;
}

export function getCourse(slug: string): Course | undefined {
  return getCatalog().courses.find((c) => c.slug === slug);
}

export function getSession(id: string): LessonSession | undefined {
  return getCatalog().sessions.find((s) => s.id === id);
}

export function activeScopeLabel(): string {
  return ACTIVE_SCOPE.label;
}
