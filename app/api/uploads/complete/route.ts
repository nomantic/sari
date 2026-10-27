import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { isManagedKey, keyPrefixFor, sanitizeFileName, validateUpload } from "@/lib/format";
import { resolveTarget } from "@/lib/targets";
import {
  deleteObject,
  headObject,
  invalidateFilesCache,
  isStorageConfigured,
  readManifest,
  writeManifest,
} from "@/lib/storage";
import type { FileRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  sessionId?: string;
  key?: string;
  fileName?: string;
  size?: number;
  contentType?: string;
  uploadedBy?: string;
  note?: string;
}

/**
 * Step 2 of an upload: verify the object really landed in R2 with the declared
 * size, then record it in the manifest so the lesson page lists it.
 */
export async function POST(request: Request) {
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

  const key = String(body.key ?? "");
  if (!isManagedKey(key) || !key.startsWith(keyPrefixFor(target))) {
    return NextResponse.json({ error: "Chiave file non valida per questa destinazione." }, { status: 400 });
  }

  const fileName = sanitizeFileName(String(body.fileName ?? key.split("__").pop() ?? "file"));
  const invalid = validateUpload({ name: fileName, size: Number(body.size ?? 0), type: body.contentType });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const head = await headObject(key);
  if (!head) {
    return NextResponse.json({ error: "Il file non risulta caricato su R2. Riprova." }, { status: 409 });
  }
  if (head.size > MAX_UPLOAD_BYTES) {
    await deleteObject(key).catch(() => undefined);
    invalidateFilesCache();
    return NextResponse.json({ error: "File oltre il limite consentito: caricamento annullato." }, { status: 413 });
  }

  const manifest = await readManifest();
  if (manifest.files.some((f) => f.key === key)) {
    return NextResponse.json({ ok: true, record: manifest.files.find((f) => f.key === key) });
  }

  const uploadedBy = (body.uploadedBy ?? "").toString().trim().slice(0, 80) || undefined;
  const note = (body.note ?? "").toString().trim().slice(0, 280) || undefined;

  const record: FileRecord = {
    key,
    sessionId: target.id,
    courseId: target.courseId,
    name: fileName,
    size: head.size,
    contentType: head.contentType || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    note,
  };

  await writeManifest([...manifest.files, record]);

  return NextResponse.json({ ok: true, record });
}

