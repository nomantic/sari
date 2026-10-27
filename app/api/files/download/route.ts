import { NextResponse } from "next/server";
import { isManagedKey } from "@/lib/format";
import { isStorageConfigured, listFiles, presignUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Download: only keys present in the manifest are served, so the bucket cannot
 * be used as an anonymous file host. Pages are NOT redirected to a presigned
 * GET — Cloudflare enforces `Content-Disposition: attachment` on signed URLs,
 * and PDFs/docs should open inline. They stream through Next.js instead;
 * binary media (video/audio/archives/images) uses a presigned URL so large
 * files never pass through the app server.
 */
const INLINE_EXTENSIONS = new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "rtf", "txt", "md", "csv"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });
  if (!isStorageConfigured()) return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });

  const record = (await listFiles()).find((f) => f.key === key);
  if (!record) return NextResponse.json({ error: "File non trovato nell'indice del corso." }, { status: 404 });

  const ext = record.name.slice(record.name.lastIndexOf(".") + 1).toLowerCase();

  if (searchParams.get("mode") === "url" && !INLINE_EXTENSIONS.has(ext)) {
    const url = await presignUrl(key, "GET", 300);
    return NextResponse.redirect(url, 302);
  }

  // Stream through the server so the browser gets an inline disposition.
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

  const safeName = record.name.replace(/["\\\r\n]/g, "_");
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": record.contentType || "application/octet-stream",
      "Content-Length": String(record.size),
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(record.name)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
