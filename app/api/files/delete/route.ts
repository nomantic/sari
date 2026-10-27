import { NextResponse } from "next/server";
import { isManagedKey } from "@/lib/format";
import { deleteObject, invalidateFilesCache, isStorageConfigured, readManifest, writeManifest } from "@/lib/storage";
import { canDelete } from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  key?: string;
  token?: string;
  reason?: string;
}

/**
 * Removal is the only privileged operation:
 *  - the browser that uploaded the file (7-day cookie / token), or
 *  - a moderator session (POST /api/moderator with the passcode).
 * Anyone else gets a 403.
 */
export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const key = String(body.key ?? "");
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });

  const verdict = await canDelete(key, body.token);
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        error:
          "Eliminazione non consentita: chi ha pubblicato il file può rimuoverlo solo dal proprio dispositivo, altrimenti serve un moderatore.",
        code: "FORBIDDEN",
      },
      { status: 403 },
    );
  }

  const manifest = await readManifest();
  const entry = manifest.files.find((f) => f.key === key);
  if (!entry || entry.hidden) return NextResponse.json({ error: "File non presente nell'indice." }, { status: 404 });

  if (verdict.role === "moderator") {
    await deleteObject(key);
    await writeManifest(manifest.files.map((f) => (f.key === key ? { ...f, hidden: true } : f)));
  } else {
    // Uploader: soft-delete only, so the manifest and object remain recoverable
    // by a moderator if the removal was a mistake.
    await writeManifest(manifest.files.map((f) => (f.key === key ? { ...f, hidden: true } : f)));
  }
  invalidateFilesCache();

  return NextResponse.json({ ok: true, removed: entry.name, by: verdict.role });
}
