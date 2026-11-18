import { listNews, type NewsPost } from "@/lib/news";
import { isStorageConfigured } from "@/lib/storage";
import { NoticesStrip } from "./notices-strip";

/**
 * Notices strip directly under the navbar on every page.
 *
 * The strip is only a trigger: clicking it opens a readable popup, and on a
 * first visit the popup opens by itself so nobody misses an announcement.
 * Storage failures are swallowed so a hiccup never breaks a page.
 */
const globalForNewsBar = globalThis as unknown as { __sariNewsBar?: { posts: NewsPost[]; at: number } };
const TTL_MS = 20_000;

async function recentPosts(): Promise<NewsPost[]> {
  if (!isStorageConfigured()) return [];
  const cached = globalForNewsBar.__sariNewsBar;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.posts;
  try {
    const posts = await listNews();
    // Pinned first, then newest: the order people expect in a notice board.
    const ordered = [...posts].sort((a, b) => {
      const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pin !== 0) return pin;
      return b.createdAt.localeCompare(a.createdAt);
    });
    globalForNewsBar.__sariNewsBar = { posts: ordered, at: Date.now() };
    return ordered;
  } catch (err) {
    console.error("[avvisi] barra avvisi non disponibile:", err);
    return [];
  }
}

export async function NoticesBar() {
  const posts = await recentPosts();
  if (!posts.length) return null;

  return (
    <NoticesStrip
      posts={posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        author: p.author,
        createdAt: p.createdAt,
        pinned: Boolean(p.pinned),
      }))}
    />
  );
}
