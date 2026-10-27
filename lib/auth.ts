import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Deletion is the only privileged action in the app. Anyone may upload and
 * download; removing a file requires either the moderator passcode or the
 * Deletion token kept in the local `sari-deletion-book` file (written when the
 * app created the upload, i.e. only on the machine the file came from).
 */

export const MODERATOR_COOKIE = "sari_mod";

export function moderatorConfigured(): boolean {
  return Boolean(process.env.MODERATOR_PASSCODE && process.env.MODERATOR_PASSCODE.length >= 8);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function safeEqual(a: string, b: string): boolean {
  const da = digest(a);
  const db = digest(b);
  return timingSafeEqual(da, db);
}

export function checkPasscode(candidate: string): boolean {
  const expected = process.env.MODERATOR_PASSCODE;
  if (!expected || expected.length < 8) return false;
  if (!candidate) return false;
  return safeEqual(candidate, expected);
}

/** Stateless cookie value: HMAC-like digest of the passcode + server secret. */
export function moderatorCookieValue(): string {
  const secret = process.env.MODERATOR_COOKIE_SECRET || process.env.MODERATOR_PASSCODE || "";
  return createHmac("sha256", secret)
    .update("sari-moderator-v1")
    .digest("hex");
}

export function isValidModeratorCookie(value: string | undefined): boolean {
  if (!moderatorConfigured() || !value) return false;
  return safeEqual(value, moderatorCookieValue());
}

/**
 * `Secure` must follow the actual transport, not NODE_ENV: a production build
 * served over plain HTTP (localhost, LAN, self-hosted) would otherwise set a
 * cookie the browser never sends back, silently breaking deletions.
 */
export function isHttpsRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}
