import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { NavSearch } from "@/components/nav-search";
import { NavMenu } from "@/components/nav-menu";
import { NoticesBar } from "@/components/notices-bar";
import { ACADEMIC_YEAR, SOURCE_URLS } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "SARI · Materiali didattici",
    template: "%s · SARI Materiali",
  },
  description:
    "Materiali delle lezioni del corso di laurea in Scienze dell'Amministrazione e delle Relazioni Internazionali (Università di Roma Tor Vergata), organizzati per data e ora della lezione.",
  applicationName: "SARI Materiali",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070b16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
        >
          Vai al contenuto
        </a>

        <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/80 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {/* One row everywhere: logo, search, menu. On phones the search
                shares the row instead of taking an extra one. */}
            <div className="flex h-16 items-center gap-2 sm:gap-3">
              <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="SARI — pagina iniziale">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-sm font-black tracking-tight text-white shadow-lg shadow-brand-500/25">
                  SA
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-bold text-white">SARI</span>
                  <span className="hidden text-[11px] text-mist-400 lg:block">Materiali e avvisi · {ACADEMIC_YEAR}</span>
                </span>
              </Link>

              {/* Search lives in the navbar at every size — it is the fastest way in. */}
              <div className="min-w-0 flex-1 md:flex md:justify-center">
                <NavSearch compact />
              </div>

              <NavMenu />
            </div>
          </div>
        </header>

        {/* Notices sit right under the navbar, on every page. */}
        <NoticesBar />

        <main id="main">{children}</main>

        <footer className="mt-20 border-t border-white/8 bg-ink-950/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-3">
            <div>
              <p className="font-semibold text-white">
                Scienze dell&apos;Amministrazione e delle Relazioni Internazionali
              </p>
              <p className="mt-2 text-mist-400">
                Università degli studi di Roma &laquo;Tor Vergata&raquo; · Anno accademico {ACADEMIC_YEAR}
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">Fonti ufficiali</p>
              <ul className="mt-2 space-y-1 text-mist-400">
                <li>
                  <a className="hover:text-white" href={SOURCE_URLS.site} target="_blank" rel="noreferrer noopener">
                    Sito del corso →
                  </a>
                </li>
                <li>
                  <a className="hover:text-white" href={SOURCE_URLS.semesterOne} target="_blank" rel="noreferrer noopener">
                    Calendario I semestre →
                  </a>
                </li>
                <li>
                  <a className="hover:text-white" href={SOURCE_URLS.semesterTwo} target="_blank" rel="noreferrer noopener">
                    Calendario II semestre →
                  </a>
                </li>
                <li>
                  <a className="hover:text-white" href={SOURCE_URLS.manifesto} target="_blank" rel="noreferrer noopener">
                    Manifesto degli studi →
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white">Nota</p>
              <p className="mt-2 text-mist-400">
                Strumento collaborativo non ufficiale. I materiali sono caricati dagli studenti; verificare sempre
                programma e orari sul sito ufficiale dell&apos;Ateneo.
              </p>
              <Link href="/admin" className="mt-3 inline-block text-xs text-mist-400 underline-offset-4 hover:text-white hover:underline">
                Amministrazione
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
