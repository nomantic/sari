import { getCatalog } from "./catalog";
import { listNews } from "./news";
import { isStorageConfigured } from "./storage";

/**
 * Global search across the three things students look for: subjects (materie),
 * individual lessons (by date, room or professor) and notices (avvisi).
 *
 * The catalog is in memory, so subject and lesson search is instant. Notices
 * need storage, and a storage failure must never break search.
 */

export type SearchKind = "materia" | "lezione" | "avviso";

export interface SearchHit {
  kind: SearchKind;
  /** Short id used as the React key. */
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** Extra words used for ranking (not shown). */
  meta: string;
}

const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function humanDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface SearchOptions {
  limit?: number;
  /** Restrict to one kind (used by "vedi tutte le lezioni"). */
  kinds?: SearchKind[];
}

export async function search(query: string, options: SearchOptions = {}): Promise<SearchHit[]> {
  const q = normalise(query.trim());
  if (q.length < 2) return [];

  const { courses, sessions } = getCatalog();
  const limit = options.limit ?? 40;
  const allow = (kind: SearchKind) => !options.kinds || options.kinds.includes(kind);
  const tokens = q.split(/\s+/).filter(Boolean);
  const hits: Array<SearchHit & { score: number }> = [];

  const matches = (haystack: string) => tokens.every((t) => haystack.includes(t));

  if (allow("materia")) {
    for (const course of courses) {
      const haystack = normalise(
        `${course.name} ${course.short} ${course.professors.join(" ")} ${course.code ?? ""} ${course.area}`,
      );
      if (!matches(haystack)) continue;
      hits.push({
        kind: "materia",
        id: `c-${course.id}`,
        title: course.name,
        subtitle: `${course.professors.join(", ")} · ${course.sessions.length} lezioni`,
        href: `/corsi/${course.slug}`,
        meta: haystack,
        score: normalise(course.name).startsWith(q) ? 100 : 60,
      });
    }
  }

  if (allow("lezione")) {
    for (const session of sessions) {
      const haystack = normalise(
        `${session.courseName} ${session.courseShort} ${session.professors.join(" ")} ${session.room} ${session.date} ${humanDate(session.date)}`,
      );
      if (!matches(haystack)) continue;
      hits.push({
        kind: "lezione",
        id: `s-${session.id}`,
        title: session.courseName,
        subtitle: `${humanDate(session.date)} · ${session.start.slice(11, 16)}–${session.end.slice(11, 16)} · ${session.room}`,
        href: `/corsi/${session.courseSlug}#${session.id}`,
        meta: haystack,
        // Date-like queries should surface the nearest lessons first.
        score: 40 + (session.date >= new Date().toISOString().slice(0, 10) ? 20 : 0),
      });
    }
  }

  if (allow("avviso") && isStorageConfigured()) {
    try {
      for (const post of await listNews()) {
        const haystack = normalise(`${post.title} ${post.body} ${post.author}`);
        if (!matches(haystack)) continue;
        hits.push({
          kind: "avviso",
          id: `n-${post.id}`,
          title: post.title,
          subtitle: `${post.author} · ${post.body.slice(0, 90)}`,
          href: "/avvisi",
          meta: haystack,
          score: normalise(post.title).startsWith(q) ? 90 : 50,
        });
      }
    } catch (err) {
      console.error("[search] avvisi non disponibili:", err);
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "it"))
    .slice(0, limit)
    .map((hit) => ({
      kind: hit.kind,
      id: hit.id,
      title: hit.title,
      subtitle: hit.subtitle,
      href: hit.href,
      meta: hit.meta,
    }));
}
