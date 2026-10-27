import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { addNews, deleteNews, listNews, setPinned, validateNews } from "@/lib/news";
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

function badId() {
  return NextResponse.json({ error: "Avviso non valido." }, { status: 400 });
}

const ID_RE = /^[a-z0-9-]{6,40}$/i;

/** Board listing (used by the client after a post). */
export async function GET() {
  if (!isStorageConfigured()) return notConfigured();
  const posts = await listNews();
  return NextResponse.json({ posts });
}

interface Body {
  title?: string;
  body?: string;
  author?: string;
}

/** Anyone may publish; the notice appears immediately. */
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
  return NextResponse.json({ ok: true, post });
}

interface PatchBody {
  id?: string;
  pinned?: boolean;
}

/** Pin/unpin — admin only (pinned notices stay at the top for everyone). */
export async function PATCH(request: Request) {
  if (!isStorageConfigured()) return notConfigured();
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Solo un amministratore può fissare un avviso." }, { status: 403 });
  }

  let payload: PatchBody;
  try {
    payload = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const id = String(payload.id ?? "");
  if (!ID_RE.test(id)) return badId();

  const updated = await setPinned(id, Boolean(payload.pinned));
  if (!updated) return NextResponse.json({ error: "Avviso non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true, post: updated });
}

interface DeleteBody {
  id?: string;
}

/** Removal — admin only. Publishing a notice does not let you remove it. */
export async function DELETE(request: Request) {
  if (!isStorageConfigured()) return notConfigured();
  if (!(await isAdminRequest())) {
    return NextResponse.json(
      { error: "Solo un amministratore può eliminare gli avvisi.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  let payload: DeleteBody;
  try {
    payload = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const id = String(payload.id ?? "");
  if (!ID_RE.test(id)) return badId();

  const removed = await deleteNews(id);
  if (!removed) return NextResponse.json({ error: "Avviso non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true, removed: removed.title });
}
