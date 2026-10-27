import { NextResponse } from "next/server";
import { isManagedKey } from "@/lib/format";
import { deleteObject, invalidateFilesCache, isStorageConfigured, readManifest, writeManifest } from "@/lib/storage";
import { canDeleteKey } from "@/lib/ownership";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  key?: string;
  token?: string;
  reason?: string;
}

/**
 * Deleting a material is allowed for:
 *  - an admin session from `/admin` (anything), and
 *  - the browser that uploaded that specific file (token + cookie, 7 days).
 * Everyone else gets 403, enforced server-side.
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

  const role = await canDeleteKey(key, body.token);
  if (role === "none") {
    return NextResponse.json(
      {
        error:
          "Puoi eliminare solo i materiali che hai caricato tu, dal dispositivo con cui li hai caricati. Per gli altri serve un amministratore (/admin).",
        code: "FORBIDDEN",
      },
      { status: 403 },
    );
  }

  const manifest = await readManifest();
  const entry = manifest.files.find((f) => f.key === key);
  if (!entry || entry.hidden) return NextResponse.json({ error: "File non presente nell'indice." }, { status: 404 });

  if (role === "admin") {
    // Hard delete: remove the object and its index entry.
    await deleteObject(key);
    await writeManifest(manifest.files.filter((f) => f.key !== key));
  } else {
    // Uploader: soft delete, so a mistaken removal is recoverable by an admin.
    await writeManifest(manifest.files.map((f) => (f.key === key ? { ...f, hidden: true } : f)));
  }
  invalidateFilesCache();

  return NextResponse.json({ ok: true, removed: entry.name, by: role });
}
