import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidModeratorCookie, MODERATOR_COOKIE } from "@/lib/auth";
import { canDeleteWith } from "@/lib/ownership";
import { addNews, deleteNews, listNews, newsAuthorToken, setPinned, validateNews } from "@/lib/news";
import { isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Simple in-process rate limit. The board is open to everyone, so this is the
 * only thing standing between a script and a flood of notices — but it must
 * stay generous enough for a class group coordinating in the morning.
 * Reset on every deploy, which is acceptable for the job.
 */
const LIMIT = Number(process.env.NEWS_RATE_LIMIT_PER_HOUR ?? 20);
const WINDOW_MS = 60 * 60 * 1000;
const globalForLimit = globalThis as unknown as { __sariNewsHits?: Map<string, number[]> };

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local").slice(0, 64);
}

function rateLimited(request: Request): boolean {
  const map = (globalForLimit.__sariNewsHits ??= new Map());
  const key = clientKey(request);
  const now = Date.now();
  const hits = (map.get(key) ?? []).filter((t: number) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    map.set(key, hits);
    return true;
  }
  hits.push(now);
  map.set(key, hits);
  if (map.size > 5000) map.clear();
  return false;
}

function notConfigured() {
  return NextResponse.json(
    { error: "Lo storage non è configurato: gli avvisi non possono essere letti o pubblicati." },
    { status: 503 },
  );
}

/** Board listing (used by the client after a post). */
export async function GET() {
  if (!isStorageConfigured()) return notConfigured();
  const posts = await listNews();
  return NextResponse.json({ posts: posts.map((post) => ({ ...post, isMine: false })) });
}

interface Body {
  title?: string;
  body?: string;
  author?: string;
  pinned?: boolean;
}

export async function POST(request: Request) {
  if (!isStorageConfigured()) return notConfigured();

  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = validateNews(payload);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "Hai pubblicato troppi avvisi di recente. Riprova più tardi." },
      { status: 429 },
    );
  }

  const post = await addNews({ title: parsed.title, body: parsed.body, author: parsed.author });
  return NextResponse.json({ ok: true, post, token: newsAuthorToken(post.id) });
}

interface PatchBody {
  id?: string;
  pinned?: boolean;
}

/** Pin/unpin — moderator only (pinned notices stay at the top for everyone). */
export async function PATCH(request: Request) {
  if (!isStorageConfigured()) return notConfigured();

  const store = await cookies();
  if (!isValidModeratorCookie(store.get(MODERATOR_COOKIE)?.value)) {
    return NextResponse.json({ error: "Solo il moderatore può fissare un avviso." }, { status: 403 });
  }

  let payload: PatchBody;
  try {
    payload = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const id = String(payload.id ?? "");
  if (!/^[a-z0-9-]{6,40}$/i.test(id)) {
    return NextResponse.json({ error: "Avviso non valido." }, { status: 400 });
  }

  const updated = await setPinned(id, Boolean(payload.pinned));
  if (!updated) return NextResponse.json({ error: "Avviso non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true, post: updated });
}

interface DeleteBody {
  id?: string;
  token?: string;
}

/** Removal: the author (from their device) or the moderator. */
export async function DELETE(request: Request) {
  if (!isStorageConfigured()) return notConfigured();

  let payload: DeleteBody;
  try {
    payload = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const id = String(payload.id ?? "");
  if (!/^[a-z0-9-]{6,40}$/i.test(id)) {
    return NextResponse.json({ error: "Avviso non valido." }, { status: 400 });
  }

  // Same ownership rules as files, in the news token domain.
  const verdict = await canDeleteWith(`news:${id}`, payload.token, newsAuthorToken(id));
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        error: "Puoi rimuovere solo gli avvisi che hai scritto tu, dal dispositivo con cui li hai pubblicati.",
        code: "FORBIDDEN",
      },
      { status: 403 },
    );
  }

  const removed = await deleteNews(id);
  if (!removed) return NextResponse.json({ error: "Avviso non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true, removed: removed.title, by: verdict.role });
}
