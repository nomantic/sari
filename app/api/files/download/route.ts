import { NextResponse } from "next/server";
import { isManagedKey } from "@/lib/format";
import { isStorageConfigured, listFiles, presignUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * File delivery.
 *
 * Two explicit modes, because "open" and "download" are different intents:
 *
 *   ?mode=download (default for the Download button) → Content-Disposition:
 *       attachment, so the browser saves the file and never renders it.
 *   ?mode=inline → opens in a tab (PDF, images, video preview).
 *
 * Only keys present in the manifest are served, so the bucket cannot be used as
 * an anonymous file host. Documents stream through Next.js (R2 signs its own
 * URLs as downloads, which is no use for inline preview). Large media uses a
 * presigned URL so 200 MB files never pass through the app server.
 */
const DOC_EXTENSIONS = new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "rtf", "txt", "md", "csv"]);
const INLINE_EXTENSIONS = new Set([...DOC_EXTENSIONS, "png", "jpg", "jpeg", "gif", "webp", "svg"]);

/** RFC 5987 filename so accented names survive every browser. */
function disposition(mode: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\\r\n]/g, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });
  if (!isStorageConfigured()) return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });

  const record = (await listFiles()).find((f) => f.key === key);
  if (!record) return NextResponse.json({ error: "File non trovato nell'indice del corso." }, { status: 404 });

  // Downloads are the common case: a bare link saves the file.
  const mode = searchParams.get("mode") === "inline" ? "inline" : "attachment";
  const ext = record.name.slice(record.name.lastIndexOf(".") + 1).toLowerCase();

  // Large media can bypass the server, but only for viewing: a presigned URL
  // would be served as an attachment by R2, which is wrong for inline preview
  // and unnecessary for download (the stream below is what sets the headers).
  if (mode === "inline" && !INLINE_EXTENSIONS.has(ext)) {
    const url = await presignUrl(key, "GET", 300);
    return NextResponse.redirect(url, 302);
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
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Impossibile leggere il file (${upstream.status}).` }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": record.contentType || "application/octet-stream",
      "Content-Length": String(record.size),
      "Content-Disposition": disposition(mode, record.name),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
