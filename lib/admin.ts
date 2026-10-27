import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_EPOCH_KEY, adminConfigured, isValidAdminCookieFor } from "@/lib/auth";
import { getObjectText, isStorageConfigured, putObject } from "@/lib/storage";

/**
 * Session epoch, stored next to the rest of the app's state in the bucket.
 * Bumping it on logout invalidates every admin cookie that came before, which a
 * pure in-memory counter could not do across serverless instances.
 */
type EpochCache = { value: number; at: number };
const globalForEpoch = globalThis as unknown as { __sariAdminEpoch?: EpochCache };
const EPOCH_TTL_MS = 10_000;

export async function readAdminEpoch(): Promise<number> {
  const cached = globalForEpoch.__sariAdminEpoch;
  if (cached && Date.now() - cached.at < EPOCH_TTL_MS) return cached.value;

  if (!isStorageConfigured()) return cached?.value ?? 0;
  try {
    const raw = await getObjectText(ADMIN_EPOCH_KEY);
    const value = raw ? Number.parseInt(raw.trim(), 10) || 0 : 0;
    globalForEpoch.__sariAdminEpoch = { value, at: Date.now() };
    return value;
  } catch {
    // Storage hiccup: fall back to the last known value rather than locking
    // everyone out; an unreadable epoch must not be treated as "no sessions".
    return cached?.value ?? 0;
  }
}

/** Invalidate all existing sessions (used on logout). */
export async function bumpAdminEpoch(): Promise<number> {
  const next = (await readAdminEpoch()) + 1;
  if (isStorageConfigured()) {
    await putObject(ADMIN_EPOCH_KEY, String(next), "text/plain; charset=utf-8", "no-store");
  }
  globalForEpoch.__sariAdminEpoch = { value: next, at: Date.now() };
  return next;
}

/**
 * Single question asked by every deleting endpoint: is this request from a
 * logged-in admin whose session has not been revoked? Uploading never grants
 * the right to remove anything.
 */
export async function isAdminRequest(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return isValidAdminCookieFor(cookie, await readAdminEpoch());
}
