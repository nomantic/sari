import { createHash } from "node:crypto";
import type { FileRecord, FileVotes } from "./types";

/**
 * Usefulness voting on materials.
 *
 * One vote per browser: the client keeps a random id in localStorage and sends
 * it as a header. The server stores only a hash of it inside each file's
 * `votes.voters`, so a repeat vote replaces the previous one instead of adding
 * a new one, and no raw identifier is persisted.
 *
 * Honest limitation: clearing storage or using a private window yields a new
 * id, so this stops accidental double-clicks and casual manipulation, not a
 * determined person. Real per-person voting would require accounts.
 */

export const VOTE_COOKIE = "sari_voter";

export function emptyVotes(): FileVotes {
  return { up: 0, down: 0, voters: {} };
}

export function votesOf(file: FileRecord): FileVotes {
  const votes = file.votes;
  if (!votes || typeof votes.up !== "number" || typeof votes.down !== "number") return emptyVotes();
  return { up: votes.up, down: votes.down, voters: votes.voters ?? {} };
}

/** Wilson-ish simple score: net votes, tie-broken by total activity. */
export function scoreOf(file: FileRecord): number {
  const { up, down } = votesOf(file);
  return up - down;
}

export function totalVotes(file: FileRecord): number {
  const { up, down } = votesOf(file);
  return up + down;
}

function voterSecret(): string {
  return process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_PASSCODE || "sari-dev-secret";
}

/** Accept only plausible client ids; anything else cannot be tracked. */
export function normaliseVoterId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(value)) return null;
  return value;
}

export function hashVoter(voterId: string): string {
  return createHash("sha256").update(`voter:${voterId}:${voterSecret()}`).digest("hex").slice(0, 16);
}

export type VoteChoice = 1 | -1 | 0;

export interface VoteResult {
  votes: FileVotes;
  /** What this voter's vote became: 1 up, -1 down, 0 cleared. */
  mine: VoteChoice;
}

/**
 * Apply a vote. `choice` of 0 is "remove my vote". Voting the same value twice
 * toggles it off, which is what people expect from a thumb button.
 */
export function applyVote(existing: FileVotes, voterHash: string, choice: VoteChoice): VoteResult {
  const voters = { ...existing.voters };
  let up = existing.up;
  let down = existing.down;

  const previous = voters[voterHash];
  if (previous === 1) up = Math.max(0, up - 1);
  if (previous === -1) down = Math.max(0, down - 1);

  // Same button pressed again → clear the vote.
  const next: VoteChoice = previous === choice ? 0 : choice;

  if (next === 1) {
    up += 1;
    voters[voterHash] = 1;
  } else if (next === -1) {
    down += 1;
    voters[voterHash] = -1;
  } else {
    delete voters[voterHash];
  }

  return { votes: { up, down, voters }, mine: next };
}

/** `mine` for a visitor, without changing anything. */
export function voteOf(votes: FileVotes, voterHash: string | null): VoteChoice {
  if (!voterHash) return 0;
  return votes.voters[voterHash] ?? 0;
}

/**
 * Order for a file list: highest score first, then most votes, then name.
 * Files with no votes keep their natural (alphabetical) order among themselves.
 */
export function sortByUsefulness(files: FileRecord[]): FileRecord[] {
  return [...files].sort((a, b) => {
    const diff = scoreOf(b) - scoreOf(a);
    if (diff !== 0) return diff;
    const total = totalVotes(b) - totalVotes(a);
    if (total !== 0) return total;
    return a.name.localeCompare(b.name, "it");
  });
}
