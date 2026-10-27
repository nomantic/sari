import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminCookieFor, safeEqual } from "@/lib/auth";
import { readAdminEpoch } from "@/lib/admin";

/**
 * Two ways to delete a material:
 *
 *  1. **Admin** — a session from `/admin`, which may delete anything.
 *  2. **Uploader** — whoever's browser uploaded the file, for a limited time.
 *     A token bound to the object key is returned once at upload time and kept
 *     in that browser's localStorage; a cookie remembers the key too, so it
 *     survives a cleared token store.
 *
 * Both are checked server-side on every delete. Uploading through a *different*
 * browser or device does not grant the ability to delete.
 */
const UPLOADER_COOKIE = "sari_up";
const UPLOADER_TOKEN_DAYS = 7;

function secret(): string {
  return process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSCODE || "sari-dev-secret";
}

/** Deterministic per key, unguessable without the server secret. */
export function uploaderToken(key: string): string {
  return createHash("sha256").update(`uploader-v2:${key}:${secret()}`).digest("hex").slice(0, 32);
}

/** Cookie values arrive percent-encoded (keys contain slashes). */
function decodeCookie(raw: string): string[] {
  try {
    return decodeURIComponent(raw).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function uploaderCookieMaxAge(): number {
  return 60 * 60 * 24 * UPLOADER_TOKEN_DAYS;
}

export async function rememberUploader(key: string, https: boolean): Promise<void> {
  const store = await cookies();
  const existing = decodeCookie(store.get(UPLOADER_COOKIE)?.value ?? "");
  const keys = Array.from(new Set([...existing, key])).slice(-20);
  store.set(UPLOADER_COOKIE, encodeURIComponent(keys.join("\n")), {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    maxAge: uploaderCookieMaxAge(),
  });
}

export type DeleteRole = "admin" | "uploader" | "none";

/**
 * Who may delete this key. Admin wins, then the uploader's token, then the
 * uploader cookie.
 */
export async function canDeleteKey(key: string, token?: string | null): Promise<DeleteRole> {
  const store = await cookies();

  const adminCookie = store.get(ADMIN_COOKIE)?.value;
  if (adminCookie) {
    const epoch = await readAdminEpoch().catch(() => 0);
    if (isValidAdminCookieFor(adminCookie, epoch)) return "admin";
  }

  if (token && safeEqual(token, uploaderToken(key))) return "uploader";
  if (decodeCookie(store.get(UPLOADER_COOKIE)?.value ?? "").includes(key)) return "uploader";

  return "none";
}

export { UPLOADER_COOKIE };
