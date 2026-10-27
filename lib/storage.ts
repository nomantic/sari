import { AwsClient } from "aws4fetch";
import type { FileRecord } from "./types";

/**
 * Cloudflare R2 (S3-compatible) access.
 *
 * Every request is signed server-side with SigV4 — the bucket stays private and
 * its credentials never reach the browser. `aws4fetch` is used instead of the
 * full AWS SDK so the deployed bundle stays small.
 */

const ENDPOINT = (process.env.R2_ENDPOINT ?? "https://d126d2072cbefe37feb7b2c948b83f63.r2.cloudflarestorage.com").replace(/\/+$/, "");
const BUCKET = process.env.R2_BUCKET ?? "sari";
const REGION = process.env.R2_REGION ?? "auto";
const MANIFEST_KEY = process.env.R2_MANIFEST_KEY ?? "sari-manifest.json";

export class StorageNotConfiguredError extends Error {
  constructor(message = "Object storage non configurato: R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY mancanti.") {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}

export class StorageError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}

let client: AwsClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && ENDPOINT && BUCKET);
}

function getClient(): AwsClient {
  if (!isStorageConfigured()) throw new StorageNotConfiguredError();
  if (!client) {
    client = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: REGION,
      retries: 1,
    });
  }
  return client;
}

function objectUrl(key: string): string {
  const safeKey = key.split("/").map(encodeURIComponent).join("/");
  return `${ENDPOINT}/${BUCKET}/${safeKey}`;
}

export function publicBucketUrl(): string {
  return `${ENDPOINT}/${BUCKET}`;
}

/**
 * Build a signed URL for a browser. `expiresIn` (seconds) is honoured through
 * X-Amz-Expires, so the link stops working after the upload/download window.
 */
export async function presignUrl(
  key: string,
  method: "GET" | "PUT",
  expiresIn = 600,
  extra?: { contentType?: string },
): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const signedHeaders: Record<string, string> = {};
  if (method === "PUT") {
    // MUST NOT be part of the signature: browsers are allowed to send any
    // content-type while the object stays served as an attachment (built-in
    // Storage uses content-disposition for that reason).
    signedHeaders["content-type"] = extra?.contentType || "application/octet-stream";
  }
  const signed = await getClient().sign(new Request(url, { method, headers: signedHeaders }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
  cacheControl = "public, max-age=60",
): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), {
    method: "PUT",
    headers: { "content-type": contentType, "cache-control": cacheControl },
    body: body as BodyInit,
  });
  if (!res.ok) {
    throw new StorageError(`Upload fallito su R2 (${res.status}): ${(await res.text()).slice(0, 300)}`, res.status);
  }
}

export async function headObject(key: string): Promise<{ size: number; contentType: string } | null> {
  const res = await getClient().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new StorageError(`HEAD ${key} → ${res.status}`, res.status);
  return {
    size: Number(res.headers.get("content-length") ?? 0),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function deleteObject(key: string): Promise<void> {
  const res = await getClient().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new StorageError(`DELETE ${key} → ${res.status}`, res.status);
  }
}

export async function getObjectText(key: string): Promise<string | null> {
  const res = await getClient().fetch(objectUrl(key), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new StorageError(`GET ${key} → ${res.status}`, res.status);
  return res.text();
}

// ───────────────────────── manifest ─────────────────────────

interface Manifest {
  version: 1;
  updatedAt: string;
  files: FileRecord[];
}

const EMPTY: Manifest = { version: 1, updatedAt: new Date(0).toISOString(), files: [] };

/** Permission is not in this bucket, or the manifest object is missing. */
export async function readManifest(): Promise<Manifest> {
  if (!isStorageConfigured()) return EMPTY;
  const raw = await getObjectText(MANIFEST_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Manifest;
    if (!parsed || !Array.isArray(parsed.files)) return EMPTY;
    return { version: 1, updatedAt: parsed.updatedAt ?? EMPTY.updatedAt, files: parsed.files };
  } catch {
    return EMPTY;
  }
}

export async function writeManifest(files: FileRecord[]): Promise<void> {
  const manifest: Manifest = { version: 1, updatedAt: new Date().toISOString(), files };
  await putObject(MANIFEST_KEY, JSON.stringify(manifest), "application/json; charset=utf-8", "no-store");
  invalidateFilesCache();
}

// ───────────────────────── cached reads ─────────────────────────

type CacheEntry = { files: FileRecord[]; at: number };
const globalForFiles = globalThis as unknown as { __sariFiles?: CacheEntry };
const TTL_MS = 15_000;

export function invalidateFilesCache(): void {
  globalForFiles.__sariFiles = undefined;
}

export async function listFiles(): Promise<FileRecord[]> {
  const cached = globalForFiles.__sariFiles;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.files;
  const manifest = await readManifest();
  const files = manifest.files.filter((f) => !f.hidden);
  globalForFiles.__sariFiles = { files, at: Date.now() };
  return files;
}

/**
 * Group visible files by target: a lesson id, or `exam:<courseId>` for a
 * course's exam materials. One map serves both kinds.
 */
export async function filesByTarget(): Promise<Map<string, FileRecord[]>> {
  const map = new Map<string, FileRecord[]>();
  for (const file of await listFiles()) {
    const list = map.get(file.sessionId) ?? [];
    list.push(file);
    map.set(file.sessionId, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, "it"));
  return map;
}
