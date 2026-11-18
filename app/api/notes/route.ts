import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { examObjectKeyFor, objectKeyFor, sanitizeFileName } from "@/lib/format";
import { getSession } from "@/lib/catalog";
import { resolveTarget } from "@/lib/targets";
import {
  invalidateFilesCache,
  isStorageConfigured,
  putObject,
  readManifest,
  writeManifest,
} from "@/lib/storage";
import type { FileRecord } from "@/lib/types";
import { rememberUploader, uploaderToken } from "@/lib/ownership";
import { isHttpsRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  sessionId?: string;
  title?: string;
  body?: string;
  uploadedBy?: string;
  note?: string;
}

/** Notes are small; anything this big is not a note. */
const MAX_NOTE_BYTES = 256 * 1024;
/** Guard against a runaway client: a note is text, not a document dump. */
const MAX_NOTE_CHARS = 100_000;

/**
 * Create a plain-text note from inside the app.
 *
 * The browser sends text, not a file: small notes go straight to R2 from the
 * server, so there is no presigned round-trip to go wrong. The result is an
 * ordinary manifest entry, so it lists, downloads and deletes like any upload.
 */
export async function POST(request: Request) {
  if (process.env.UPLOADS_ENABLED === "false") {
    return NextResponse.json({ error: "Gli upload sono temporaneamente disattivati." }, { status: 503 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage non configurato sul server." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const target = body.sessionId ? resolveTarget(String(body.sessionId)) : null;
  if (!target) return NextResponse.json({ error: "Materia o lezione non trovata." }, { status: 404 });

  const text = String(body.body ?? "");
  if (!text.trim()) {
    return NextResponse.json({ error: "La nota è vuota: scrivi qualcosa prima di salvarla." }, { status: 400 });
  }
  if (text.length > MAX_NOTE_CHARS) {
    return NextResponse.json(
      { error: `Nota troppo lunga (${text.length} caratteri). Limite: ${MAX_NOTE_CHARS}.` },
      { status: 400 },
    );
  }

  // Title becomes the file name, so it must survive sanitising.
  const rawTitle = String(body.title ?? "").trim();
  const baseName = sanitizeFileName(rawTitle || "Nota").replace(/\.txt$/i, "").slice(0, 80) || "Nota";
  const fileName = `${baseName}.txt`;

  const bytes = new TextEncoder().encode(text.endsWith("\n") ? text : `${text}\n`);
  if (bytes.byteLength > MAX_NOTE_BYTES) {
    return NextResponse.json({ error: `Nota troppo grande (${bytes.byteLength} byte).` }, { status: 413 });
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Nota oltre il limite consentito." }, { status: 413 });
  }

  const key =
    target.kind === "exam"
      ? examObjectKeyFor(target.courseId, fileName)
      : objectKeyFor(getSession(target.id)!, fileName);

  // A note must never overwrite something already stored under this key.
  const manifest = await readManifest();
  if (manifest.files.some((f) => f.key === key)) {
    return NextResponse.json(
      { error: "Esiste già una nota con questo titolo. Cambia il titolo." },
      { status: 409 },
    );
  }

  await putObject(key, bytes, "text/plain; charset=utf-8", "private, max-age=0");

  const uploadedBy = (body.uploadedBy ?? "").toString().trim().slice(0, 80) || undefined;
  const note = (body.note ?? "").toString().trim().slice(0, 280) || undefined;

  const record: FileRecord = {
    key,
    sessionId: target.id,
    courseId: target.courseId,
    name: fileName,
    size: bytes.byteLength,
    contentType: "text/plain; charset=utf-8",
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    note,
  };

  await writeManifest([...manifest.files, record]);
  invalidateFilesCache();
  await rememberUploader(key, isHttpsRequest(request));

  return NextResponse.json({ ok: true, record, deletionToken: uploaderToken(key) });
}
