import Link from "next/link";
import { listNews, type NewsPost } from "@/lib/news";
import { isStorageConfigured } from "@/lib/storage";

/**
 * Notices strip pinned directly under the navbar on every page, so nobody can
 * miss them. It reads the same `sari/news.json` as the board; failures are
 * swallowed so a storage hiccup never breaks a page.
 */
const globalForNewsBar = globalThis as unknown as { __sariNewsBar?: { posts: NewsPost[]; at: number } };
const TTL_MS = 20_000;

async function recentPosts(limit: number): Promise<NewsPost[]> {
  if (!isStorageConfigured()) return [];
  const cached = globalForNewsBar.__sariNewsBar;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.posts.slice(0, limit);
  try {
    const posts = await listNews();
    const ordered = [...posts].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    globalForNewsBar.__sariNewsBar = { posts: ordered, at: Date.now() };
    return ordered.slice(0, limit);
  } catch (err) {
    console.error("[avvisi] barra avvisi non disponibile:", err);
    return [];
  }
}

export async function NoticesBar() {
  const posts = await recentPosts(3);
  if (!posts.length) return null;

  const [first, ...rest] = posts;

  return (
    <section aria-labelledby="avvisi-barra" className="border-b border-gold-400/20 bg-gold-400/8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
        <h2 id="avvisi-barra" className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-400">
          <span aria-hidden>📣</span> Avvisi
        </h2>

        <Link
          href="/avvisi"
          className="min-w-0 flex-1 truncate text-sm text-mist-100 transition-colors hover:text-strong hover:underline"
          title={first.title}
        >
          {first.pinned && <span aria-hidden className="mr-1">📌</span>}
          <strong className="font-semibold text-strong">{first.title}</strong>
          <span className="text-muted"> — {first.body}</span>
        </Link>

        {rest.length > 0 && (
          <span className="hidden shrink-0 text-[11px] text-faint xl:inline">
            +{rest.length} {rest.length === 1 ? "altro" : "altri"}
          </span>
        )}

        <Link href="/avvisi" className="shrink-0 text-[11px] font-medium text-gold-400 underline-offset-4 hover:underline">
          tutti →
        </Link>
      </div>
    </section>
  );
}
