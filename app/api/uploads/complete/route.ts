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
import { rememberUploader, uploaderToken } from "@/lib/ownership";
import { isHttpsRequest } from "@/lib/auth";

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

  // A 0-byte object means the body never arrived: R2 accepts an empty PUT, so
  // without this check the file is registered and every download is empty.
  if (!head.size || head.size === 0) {
    await deleteObject(key).catch(() => undefined);
    invalidateFilesCache();
    return NextResponse.json(
      { error: "Il caricamento è arrivato vuoto (0 byte). Controlla la connessione e riprova." },
      { status: 422 },
    );
  }

  // The browser declared a size when presigning; a mismatch means the upload was
  // truncated in transit. Refuse it instead of storing a corrupt file.
  const declaredSize = Number(body.size ?? 0);
  if (declaredSize > 0 && head.size !== declaredSize) {
    await deleteObject(key).catch(() => undefined);
    invalidateFilesCache();
    return NextResponse.json(
      {
        error: `Il file è arrivato incompleto (${head.size} byte su ${declaredSize}). Riprova il caricamento.`,
      },
      { status: 422 },
    );
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
  // Remember this browser as the uploader so it can undo its own upload.
  await rememberUploader(key, isHttpsRequest(request));

  return NextResponse.json({ ok: true, record, deletionToken: uploaderToken(key) });
}

