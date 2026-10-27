import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MODERATOR_COOKIE, checkPasscode, isHttpsRequest, moderatorConfigured, moderatorCookieValue } from "@/lib/auth";
import { invalidateFilesCache } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  passcode?: string;
}

/** Exchange the moderator passcode for an httpOnly session cookie. */
export async function POST(request: Request) {
  if (!moderatorConfigured()) {
    return NextResponse.json(
      { error: "Nessun moderatore configurato: imposta MODERATOR_PASSCODE (min. 8 caratteri) nelle variabili d'ambiente." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!checkPasscode(String(body.passcode ?? ""))) {
    return NextResponse.json({ error: "Codice moderatore errato." }, { status: 401 });
  }

  const store = await cookies();
  store.set(MODERATOR_COOKIE, moderatorCookieValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  invalidateFilesCache();

  return NextResponse.json({ ok: true });
}

/** Log out of the moderator session. */
export async function DELETE() {
  const store = await cookies();
  store.delete(MODERATOR_COOKIE);
  return NextResponse.json({ ok: true });
}
