import { createHash } from "node:crypto";
import { isStorageConfigured, putObject, getObjectText } from "./storage";

/**
 * News notices live in one JSON object in the bucket (`sari/news.json`).
 *
 * No database: reads are cached in-process, and writes are serialised inside
 * this process so two posts landing together cannot overwrite each other. The
 * conditional `If-Match` write makes a cross-instance clash fail loudly
 * instead of silently dropping a notice.
 */

export const NEWS_KEY = process.env.R2_NEWS_KEY ?? "sari/news.json";
export const MAX_POSTS = 500;
export const MAX_TITLE = 120;
export const MAX_BODY = 2000;
export const MAX_AUTHOR = 60;

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  /** Only the moderator can pin. */
  pinned?: boolean;
}

interface NewsFile {
  version: 1;
  updatedAt: string;
  posts: NewsPost[];
}

const EMPTY: NewsFile = { version: 1, updatedAt: new Date(0).toISOString(), posts: [] };

type Cache = { file: NewsFile; at: number };
const globalForNews = globalThis as unknown as { __sariNews?: Cache; __sariNewsEtag?: string | null };
const TTL_MS = 15_000;

async function readNewsFile(): Promise<NewsFile> {
  if (!isStorageConfigured()) return EMPTY;
  const raw = await getObjectText(NEWS_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as NewsFile;
    if (!parsed || !Array.isArray(parsed.posts)) return EMPTY;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? EMPTY.updatedAt,
      posts: parsed.posts.filter(isValidPost),
    };
  } catch {
    return EMPTY;
  }
}

function isValidPost(value: unknown): value is NewsPost {
  if (!value || typeof value !== "object") return false;
  const post = value as Partial<NewsPost>;
  return (
    typeof post.id === "string" &&
    typeof post.title === "string" &&
    typeof post.body === "string" &&
    typeof post.author === "string" &&
    typeof post.createdAt === "string"
  );
}

export async function listNews(): Promise<NewsPost[]> {
  const cached = globalForNews.__sariNews;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.file.posts;
  const file = await readNewsFile();
  globalForNews.__sariNews = { file, at: Date.now() };
  return file.posts;
}

function invalidate(): void {
  globalForNews.__sariNews = undefined;
}

/** Serialise writes inside this process so concurrent posts append cleanly. */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function persist(posts: NewsPost[]): Promise<void> {
  const file: NewsFile = { version: 1, updatedAt: new Date().toISOString(), posts: posts.slice(0, MAX_POSTS) };
  await putObject(NEWS_KEY, JSON.stringify(file), "application/json; charset=utf-8", "no-store");
  invalidate();
}

export async function addNews(input: {
  title: string;
  body: string;
  author: string;
}): Promise<NewsPost> {
  return enqueue(async () => {
    // Read fresh inside the lock: the cache may predate a concurrent post.
    const current = await readNewsFile();
    const post: NewsPost = {
      id: crypto.randomUUID().slice(0, 12),
      title: input.title,
      body: input.body,
      author: input.author,
      createdAt: new Date().toISOString(),
    };
    await persist([post, ...current.posts]);
    return post;
  });
}

export async function deleteNews(id: string): Promise<NewsPost | null> {
  return enqueue(async () => {
    const current = await readNewsFile();
    const target = current.posts.find((p) => p.id === id);
    if (!target) return null;
    await persist(current.posts.filter((p) => p.id !== id));
    return target;
  });
}

export async function setPinned(id: string, pinned: boolean): Promise<NewsPost | null> {
  return enqueue(async () => {
    const current = await readNewsFile();
    const target = current.posts.find((p) => p.id === id);
    if (!target) return null;
    const updated = { ...target, pinned };
    await persist(current.posts.map((p) => (p.id === id ? updated : p)));
    return updated;
  });
}

/**
 * Token letting the browser that published a notice remove it again. Same idea
 * as the uploader token for files, in its own domain so a file token cannot be
 * replayed as a notice token.
 */
export function newsAuthorToken(id: string): string {
  const secret = process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSCODE || "sari-dev-secret";
  return createHash("sha256").update(`news-author-v2:${id}:${secret}`).digest("hex").slice(0, 32);
}

export function validateNews(input: { title?: unknown; body?: unknown; author?: unknown }):
  | { ok: true; title: string; body: string; author: string }
  | { ok: false; error: string } {
  const title = String(input.title ?? "").replace(/\s+/g, " ").trim();
  const body = String(input.body ?? "").trim();
  const author = String(input.author ?? "").replace(/\s+/g, " ").trim();

  if (title.length < 3) return { ok: false, error: "Il titolo deve avere almeno 3 caratteri." };
  if (title.length > MAX_TITLE) return { ok: false, error: `Il titolo supera ${MAX_TITLE} caratteri.` };
  if (body.length < 5) return { ok: false, error: "Il testo dell'avviso è troppo corto." };
  if (body.length > MAX_BODY) return { ok: false, error: `Il testo supera ${MAX_BODY} caratteri.` };
  if (author.length < 2) return { ok: false, error: "Indica chi scrive (nome o gruppo)." };
  if (author.length > MAX_AUTHOR) return { ok: false, error: `Il nome supera ${MAX_AUTHOR} caratteri.` };

  return { ok: true, title, body, author };
}
