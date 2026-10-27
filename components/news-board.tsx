"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyLocalStorageChange, useLocalStorageValue, writeLocalStorage } from "./use-local-storage";
import type { NewsPost } from "@/lib/news";

const TOKEN_KEY = "sari-news-tokens";

function readTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(TOKEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveToken(id: string, token: string) {
  try {
    const tokens = readTokens();
    tokens[id] = token;
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    notifyLocalStorageChange();
  } catch {
    // private mode — removal will then require the moderator
  }
}

function dropToken(id: string) {
  try {
    const tokens = readTokens();
    delete tokens[id];
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    notifyLocalStorageChange();
  } catch {
    // ignore
  }
}

const DATE_FMT = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function when(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
  return DATE_FMT.format(date);
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Toast({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200" role="status">
      {text}
    </p>
  );
}

export function NewsComposer({ isModerator }: { isModerator: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const remembered = useLocalStorageValue("sari-news-author");
  const [authorOverride, setAuthorOverride] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const author = authorOverride ?? remembered ?? "";
  const room = 2000 - body.length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, author }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        post?: { id: string };
        token?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Pubblicazione non riuscita.");
      if (data.post && data.token) saveToken(data.post.id, data.token);
      if (pinned && isModerator && data.post) {
        await fetch("/api/news", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: data.post.id, pinned: true }),
        });
      }
      writeLocalStorage("sari-news-author", author.trim());
      setTitle("");
      setBody("");
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
          ✏️ Scrivi un avviso
        </button>
        {done && <Toast text="Avviso pubblicato. Lo vedono tutti gli studenti." />}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface space-y-3 p-4">
      <div>
        <label htmlFor="news-author" className="label">
          Chi scrive
        </label>
        <input
          id="news-author"
          className="input"
          value={author}
          onChange={(e) => setAuthorOverride(e.target.value)}
          placeholder="Nome, o nome del gruppo"
          maxLength={60}
          required
        />
      </div>
      <div>
        <label htmlFor="news-title" className="label">
          Titolo
        </label>
        <input
          id="news-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Spostata la lezione di giovedì"
          maxLength={120}
          required
        />
      </div>
      <div>
        <label htmlFor="news-body" className="label">
          Testo
        </label>
        <textarea
          id="news-body"
          className="input min-h-28 resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Cosa devono sapere gli altri studenti?"
          maxLength={2000}
          required
        />
        <p className={`mt-1 text-right text-[11px] ${room < 100 ? "text-amber-300" : "text-mist-400"}`}>{room} caratteri</p>
      </div>

      {isModerator && (
        <label className="flex items-center gap-2 text-xs text-mist-300">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Fissa in cima (importante)
        </label>
      )}

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {busy ? "Pubblico…" : "Pubblica"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={busy}
        >
          Annulla
        </button>
      </div>
      <p className="text-[11px] text-mist-400">
        Gli avvisi sono pubblici e visibili subito. Puoi rimuovere un avviso che hai scritto tu, dal dispositivo con cui l&apos;hai
        pubblicato.
      </p>
    </form>
  );
}

export function NewsBoard({ posts, isModerator }: { posts: NewsPost[]; isModerator: boolean }) {
  const router = useRouter();
  const tokenStore = useLocalStorageValue(TOKEN_KEY);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  let tokens: Record<string, string> = {};
  try {
    tokens = tokenStore ? (JSON.parse(tokenStore) as Record<string, string>) : {};
  } catch {
    tokens = {};
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/news", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, token: tokens[id] }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Rimozione non riuscita.");
      dropToken(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  async function togglePin(id: string, next: boolean) {
    setBusyId(id);
    try {
      const res = await fetch("/api/news", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, pinned: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Operazione non riuscita.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso.");
    } finally {
      setBusyId(null);
    }
  }

  if (!posts.length) {
    return (
      <div className="surface p-10 text-center">
        <p className="text-3xl" aria-hidden>
          📣
        </p>
        <p className="mt-2 text-sm font-semibold text-white">Nessun avviso ancora</p>
        <p className="mt-1 text-xs text-mist-400">Il primo che scrive qualcosa lo vedranno tutti.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
      {posts.map((post) => {
        const mine = Boolean(tokens[post.id]);
        return (
          <article
            key={post.id}
            className={`surface p-4 ${post.pinned ? "border-gold-400/40 bg-gold-400/5" : ""}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-300">
                {initials(post.author) || "??"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {post.pinned && <span className="chip bg-gold-400/15 text-gold-400 ring-gold-400/30">📌 Fissato</span>}
                  <h3 className="text-sm font-semibold text-white">{post.title}</h3>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-mist-200">{post.body}</p>
                <p className="mt-2 text-[11px] text-mist-400">
                  {post.author} · <time dateTime={post.createdAt}>{when(post.createdAt)}</time>
                </p>
              </div>
            </div>

            {(isModerator || mine) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-2">
                {isModerator && (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[11px] text-mist-400 hover:bg-white/8 hover:text-gold-400"
                    onClick={() => togglePin(post.id, !post.pinned)}
                    disabled={busyId === post.id}
                  >
                    {post.pinned ? "Togli da cima" : "Fissa in cima"}
                  </button>
                )}
                {confirmId === post.id ? (
                  <>
                    <button
                      type="button"
                      className="rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/30"
                      onClick={() => remove(post.id)}
                      disabled={busyId === post.id}
                    >
                      {busyId === post.id ? "…" : "Conferma"}
                    </button>
                    <button type="button" className="rounded-lg px-2 py-1 text-[11px] text-mist-400" onClick={() => setConfirmId(null)}>
                      Annulla
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-[11px] text-mist-400 hover:text-red-300"
                    onClick={() => setConfirmId(post.id)}
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
