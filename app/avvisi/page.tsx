import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NewsBoard, NewsComposer } from "@/components/news-board";
import { MODERATOR_COOKIE, isValidModeratorCookie } from "@/lib/auth";
import { listNews, type NewsPost } from "@/lib/news";
import { isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Avvisi",
  description: "Avvisi e comunicazioni tra gli studenti del corso SARI.",
};

export default async function NewsPage() {
  const store = await cookies();
  const isModerator = isValidModeratorCookie(store.get(MODERATOR_COOKIE)?.value);
  const storageOk = isStorageConfigured();

  let posts: NewsPost[] = [];
  try {
    posts = await listNews();
  } catch (err) {
    console.error("[avvisi] impossibile leggere gli avvisi:", err);
  }

  // Pinned first, then newest; the list is already newest-first from storage.
  const ordered = [...posts].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Avvisi</h1>
          <p className="mt-2 max-w-xl text-mist-300">
            Comunicazioni per tutti: cambi di aula, esami, materiali mancanti, appunti di gruppo. Chiunque può pubblicare.
          </p>
        </div>
        <span className="text-xs text-mist-400">
          {posts.length} {posts.length === 1 ? "avviso" : "avvisi"}
        </span>
      </div>

      {!storageOk && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">Storage non configurato</p>
          <p className="mt-1 text-amber-200/90">
            Per pubblicare e leggere gli avvisi servono le chiavi R2 del bucket (vedi README, passo «Object storage»).
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Elenco avvisi" className="order-2 lg:order-1">
          <NewsBoard posts={ordered} isModerator={isModerator} />
        </section>
        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <NewsComposer isModerator={isModerator} />
          </div>
        </aside>
      </div>
    </div>
  );
}
