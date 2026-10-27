import { NextResponse } from "next/server";
import { isStorageConfigured, invalidateFilesCache, readManifest, writeManifest } from "@/lib/storage";
import { isManagedKey } from "@/lib/format";
import { applyVote, hashVoter, normaliseVoterId, votesOf, voteOf, type VoteChoice } from "@/lib/votes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  key?: string;
  /** 1 = useful, -1 = not useful, 0 = remove my vote. */
  vote?: number;
}

/**
 * Record a usefulness vote for one material.
 * The voter is identified by an opaque per-browser id in `x-voter-id`; the
 * server keeps only its hash, which is what enforces one vote per browser.
 */
export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });
  }

  const voterId = normaliseVoterId(request.headers.get("x-voter-id"));
  if (!voterId) {
    return NextResponse.json({ error: "Impossibile identificare il browser per il voto." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const key = String(body.key ?? "");
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });

  const choice = Number(body.vote);
  if (choice !== 1 && choice !== -1 && choice !== 0) {
    return NextResponse.json({ error: "Voto non valido." }, { status: 400 });
  }

  const manifest = await readManifest();
  const file = manifest.files.find((f) => f.key === key && !f.hidden);
  if (!file) return NextResponse.json({ error: "Materiale non trovato." }, { status: 404 });

  const voterHash = hashVoter(voterId);
  const result = applyVote(votesOf(file), voterHash, choice as VoteChoice);

  await writeManifest(manifest.files.map((f) => (f.key === key ? { ...f, votes: result.votes } : f)));
  invalidateFilesCache();

  return NextResponse.json({
    ok: true,
    up: result.votes.up,
    down: result.votes.down,
    mine: result.mine,
  });
}

/** Current tallies for one file (used on load by the client). */
export async function GET(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage non configurato." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  if (!isManagedKey(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });

  const voterId = normaliseVoterId(request.headers.get("x-voter-id"));
  const file = (await readManifest()).files.find((f) => f.key === key && !f.hidden);
  if (!file) return NextResponse.json({ error: "Materiale non trovato." }, { status: 404 });

  const votes = votesOf(file);
  return NextResponse.json({ up: votes.up, down: votes.down, mine: voteOf(votes, voterId ? hashVoter(voterId) : null) });
}
