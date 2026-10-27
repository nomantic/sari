import { NextResponse } from "next/server";
import { getSession } from "@/lib/catalog";
import { examObjectKeyFor, objectKeyFor, sanitizeFileName, validateUpload } from "@/lib/format";
import { isStorageConfigured, listFiles, presignUrl } from "@/lib/storage";
import { resolveTarget } from "@/lib/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  sessionId?: string;
  fileName?: string;
  size?: number;
  contentType?: string;
}

/**
 * Step 1 of an upload: validate the request and return a short-lived presigned
 * PUT URL. The browser uploads straight to R2; the manifest entry is written
 * only after `POST /api/uploads/complete` confirms the object exists.
 */
export async function POST(request: Request) {
  if (process.env.UPLOADS_ENABLED === "false") {
    return NextResponse.json({ error: "Gli upload sono temporaneamente disattivati." }, { status: 503 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Il server non ha le credenziali di object storage (R2). Un moderatore deve configurare R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.",
        code: "STORAGE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const target = body.sessionId ? resolveTarget(String(body.sessionId)) : null;
  if (!target) return NextResponse.json({ error: "Materia o lezione non trovata." }, { status: 404 });

  const invalid = validateUpload({
    name: String(body.fileName ?? ""),
    size: Number(body.size ?? 0),
    type: body.contentType,
  });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const key =
    target.kind === "exam"
      ? examObjectKeyFor(target.courseId, String(body.fileName))
      : objectKeyFor(getSession(target.id)!, String(body.fileName));
  const displayName = sanitizeFileName(String(body.fileName));
  const contentType =
    body.contentType && /^[\w.+-]+\/[\w.+-]+$/.test(String(body.contentType))
      ? String(body.contentType)
      : "application/octet-stream";

  const uploadUrl = await presignUrl(key, "PUT", 900, { contentType });

  let duplicateName: string | null = null;
  try {
    const sameName = (await listFiles()).filter(
      (f) => f.sessionId === target.id && f.name.toLowerCase() === displayName.toLowerCase(),
    );
    duplicateName = sameName.length ? sameName[0].name : null;
  } catch {
    // Duplicate detection is a nicety; never block the upload because of it.
  }

  return NextResponse.json({
    uploadUrl,
    key,
    sessionId: target.id,
    fileName: displayName,
    contentType,
    duplicateName,
  });
}
