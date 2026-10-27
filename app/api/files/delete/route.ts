import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { isManagedKey } from "@/lib/format";
import { deleteObject, invalidateFilesCache, isStorageConfigured, readManifest, writeManifest } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  key?: string;
  reason?: string;
}

/**
 * Removing a material is admin-only. Uploading and downloading are open to
 * everyone; nothing about having uploaded a file grants the right to delete it.
 */
export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json(
      {
        error: "Solo un amministratore può eliminare i materiali. Accedi da /admin.",
        code: "FORBIDDEN",
      },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const key = String(body.key ?? "");
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });

  const manifest = await readManifest();
  const entry = manifest.files.find((f) => f.key === key);
  if (!entry || entry.hidden) return NextResponse.json({ error: "File non presente nell'indice." }, { status: 404 });

  // Delete the object first, then drop it from the index.
  await deleteObject(key);
  await writeManifest(manifest.files.filter((f) => f.key !== key));
  invalidateFilesCache();

  return NextResponse.json({ ok: true, removed: entry.name, reason: body.reason ?? null });
}
