import { NextResponse } from "next/server";
import { isManagedKey } from "@/lib/format";
import { isStorageConfigured, listFiles } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Only plain text is viewable in the app; everything else downloads. */
const TEXT_EXTENSIONS = new Set(["txt", "md", "csv"]);
/** Refuse to pull huge objects into a JSON response. */
const MAX_VIEW_BYTES = 512 * 1024;

/**
 * Return a text material's contents so it can be read inside the app.
 *
 * Only keys present in the manifest are served, so the bucket cannot be used as
 * an anonymous file host. The body is read straight from R2 with the server's
 * credentials; the browser never sees a storage URL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });
  if (!isStorageConfigured()) return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });

  const record = (await listFiles()).find((f) => f.key === key && !f.hidden);
  if (!record) return NextResponse.json({ error: "File non trovato nell'indice del corso." }, { status: 404 });

  const ext = record.name.slice(record.name.lastIndexOf(".") + 1).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Questo formato non si può leggere qui: scaricalo." }, { status: 415 });
  }
  if (record.size > MAX_VIEW_BYTES) {
    return NextResponse.json(
      { error: `File troppo grande da mostrare (${Math.round(record.size / 1024)} KB). Scaricalo per leggerlo.` },
      { status: 413 },
    );
  }

  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_REGION } = process.env;
  const { AwsClient } = await import("aws4fetch");
  const client = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: R2_REGION ?? "auto",
  });
  const endpoint = (R2_ENDPOINT ?? "").replace(/\/+$/, "");
  const signed = await client.sign(new Request(`${endpoint}/${R2_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`));
  const upstream = await fetch(signed, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: `Impossibile leggere il file (${upstream.status}).` }, { status: 502 });
  }

  // Bytes, not text: a note's encoding is not guaranteed to be UTF-8.
  const buffer = new Uint8Array(await upstream.arrayBuffer());
  return NextResponse.json({
    ok: true,
    name: record.name,
    size: record.size,
    uploadedAt: record.uploadedAt,
    uploadedBy: record.uploadedBy ?? null,
    /** Raw bytes; the client decodes UTF-8 with a fallback for invalid sequences. */
    bytes: Array.from(buffer),
  });
}
