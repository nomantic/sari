import { getCourse, getSession } from "./catalog";
import { examTargetId, courseIdFromTarget, type FileTarget } from "./types";

/**
 * Resolve what an upload/download target refers to, refusing anything outside
 * the active scope. `exam:<courseId>` targets a whole course; anything else is
 * a lesson id.
 *
 * Used by every API route so a crafted request cannot point at a course that
 * is hidden from the site.
 */
export function resolveTarget(targetId: string): FileTarget | null {
  if (!targetId) return null;

  if (targetId.startsWith("exam:")) {
    const course = getCourse(courseIdFromTarget(targetId));
    if (!course) return null;
    return {
      id: examTargetId(course.id),
      courseId: course.id,
      kind: "exam",
      label: `${course.name} — materiali d'esame`,
    };
  }

  const session = getSession(targetId);
  if (!session) return null;
  return {
    id: session.id,
    courseId: session.courseId,
    kind: "lesson",
    label: `${session.courseName} — lezione del ${session.date}`,
  };
}

/** Every target id that may receive or serve a file (used for validation). */
export function isTargetForCourse(targetId: string, courseId: string): boolean {
  return courseIdFromTarget(targetId) === courseId;
}
