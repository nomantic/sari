import { NextResponse } from "next/server";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** `GET /api/search?q=storia` — used by the navbar search box. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 120);
  const limit = Math.min(Number(searchParams.get("limit") ?? 24) || 24, 50);

  if (q.trim().length < 2) {
    return NextResponse.json({ hits: [], query: q });
  }

  const hits = await search(q, { limit });
  return NextResponse.json({ hits, query: q });
}
