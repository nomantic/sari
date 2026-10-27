import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { MODERATOR_COOKIE, isValidModeratorCookie, safeEqual } from "@/lib/auth";

/**
 * The uploader (whoever's browser created the upload) receives a short-lived
 * token bound to that object key and can remove their own upload for a while.
 * Everybody else needs the moderator session.
 */
const UPLOADER_COOKIE = "sari_up";

function secret(): string {
  return process.env.MODERATOR_COOKIE_SECRET || process.env.MODERATOR_PASSCODE || "sari-dev-secret";
}

export function uploaderToken(key: string): string {
  return createHash("sha256").update(`uploader:${key}:${secret()}`).digest("hex").slice(0, 32);
}

/** Cookie values arrive percent-encoded (the key contains slashes). */
function decodeCookie(raw: string): string[] {
  try {
    return decodeURIComponent(raw).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function rememberUploader(key: string, https: boolean): Promise<void> {
  const store = await cookies();
  const existing = decodeCookie(store.get(UPLOADER_COOKIE)?.value ?? "");
  const keys = new Set(existing);
  keys.add(key);
  store.set(UPLOADER_COOKIE, encodeURIComponent(Array.from(keys).slice(-20).join("\n")), {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** True when this browser is the uploader of `key` or is a moderator. */
export async function canDelete(key: string, token?: string | null): Promise<{ allowed: boolean; role: "moderator" | "uploader" | null }> {
  const store = await cookies();
  if (isValidModeratorCookie(store.get(MODERATOR_COOKIE)?.value)) {
    return { allowed: true, role: "moderator" };
  }
  const expected = uploaderToken(key);
  if (token && safeEqual(token, expected)) return { allowed: true, role: "uploader" };
  if (decodeCookie(store.get(UPLOADER_COOKIE)?.value ?? "").includes(key)) {
    return { allowed: true, role: "uploader" };
  }
  return { allowed: false, role: null };
}

export { UPLOADER_COOKIE };
