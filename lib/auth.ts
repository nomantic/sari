import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin authentication.
 *
 * Uploading and downloading are open to everyone; **deleting anything** is the
 * one privileged action and belongs to admins only. Admins log in at `/admin`
 * with a single passcode read from the environment (`ADMIN_PASSCODE`).
 *
 * The session is a stateless httpOnly cookie: an HMAC over a fixed string keyed
 * with a server secret, so it cannot be forged or edited without the secret and
 * survives server restarts. There is no session store to keep.
 */

export const ADMIN_COOKIE = "sari_admin";
export const ADMIN_SESSION_HOURS = 12;

/** Minimum length for the passcode in the environment. */
const MIN_PASSCODE = 4;

/**
 * Read the configured passcode defensively: pasting into a dashboard field very
 * often brings a trailing newline or stray quotes, and a passcode that "doesn't
 * work" is indistinguishable from one that was never read.
 */
function configuredPasscode(): string {
  const raw = process.env.ADMIN_PASSCODE;
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function adminConfigured(): boolean {
  return configuredPasscode().length >= MIN_PASSCODE;
}

/** Diagnostic only: tells the operator *why* the passcode was rejected. */
export function adminConfigProblem(): string | null {
  const raw = process.env.ADMIN_PASSCODE;
  if (raw === undefined) {
    return "ADMIN_PASSCODE non è impostata per questo ambiente (Production/Preview) su Vercel.";
  }
  const value = configuredPasscode();
  if (value.length === 0) {
    return "ADMIN_PASSCODE è impostata ma vuota.";
  }
  if (value.length < MIN_PASSCODE) {
    return `ADMIN_PASSCODE è troppo corta (${value.length} caratteri, minimo ${MIN_PASSCODE}).`;
  }
  return null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time comparison through fixed-length digests. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

function sessionSecret(): string {
  // A dedicated secret is best; falling back to the passcode keeps a fresh
  // deployment working with a single variable, without weakening either.
  return (process.env.ADMIN_COOKIE_SECRET ?? "").trim() || configuredPasscode();
}

/**
 * The cookie value: an HMAC over a fixed string, keyed with a per-session
 * secret that combines the server secret with the session epoch. Bumping the
 * epoch (see `/api/admin` DELETE) invalidates every outstanding cookie at once,
 * so logging out really does end the session instead of only clearing the
 * browser copy.
 */
export const ADMIN_EPOCH_KEY = "sari/admin-epoch";

export function adminCookieValue(epoch = 0): string {
  const secret = sessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(`sari-admin-session-v2:${epoch}`).digest("hex");
}

export function checkAdminPasscode(candidate: string): boolean {
  const expected = configuredPasscode();
  if (expected.length < MIN_PASSCODE || !candidate) return false;
  return safeEqual(candidate.trim(), expected);
}

/** Value that any cookie signed with an epoch other than `current` is rejected. */
export function isValidAdminCookieFor(value: string | undefined | null, current: number): boolean {
  if (!adminConfigured() || !value) return false;
  return safeEqual(value, adminCookieValue(current));
}

/**
 * `Secure` must follow the actual transport, not NODE_ENV: a production build
 * served over plain HTTP (localhost, LAN, self-hosted) would otherwise set a
 * cookie the browser never sends back, silently breaking login.
 */
export function isHttpsRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}
