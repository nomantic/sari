import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_HOURS,
  adminConfigProblem,
  adminConfigured,
  adminCookieValue,
  checkAdminPasscode,
  isHttpsRequest,
} from "@/lib/auth";
import { invalidateFilesCache } from "@/lib/storage";
import { bumpAdminEpoch, readAdminEpoch } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  passcode?: string;
}

/** Exchange the admin passcode (env `ADMIN_PASSCODE`) for a session cookie. */
export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      {
        error: adminConfigProblem() ?? "ADMIN_PASSCODE non valida.",
        code: "ADMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!checkAdminPasscode(String(body.passcode ?? ""))) {
    return NextResponse.json({ error: "Codice amministratore errato." }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, adminCookieValue(await readAdminEpoch()), {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: 60 * 60 * ADMIN_SESSION_HOURS,
  });
  invalidateFilesCache();

  return NextResponse.json({ ok: true });
}

/**
 * Log out — and revoke. The session cookie is stateless, so simply clearing it
 * would leave any copied value valid until expiry; bumping the epoch on the
 * server invalidates every outstanding admin cookie immediately.
 */
export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  await bumpAdminEpoch();
  return NextResponse.json({ ok: true });
}
