"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const LINKS = [
  { href: "/", label: "Oggi", description: "Le lezioni di oggi e i prossimi giorni" },
  { href: "/calendario", label: "Calendario", description: "Vista mensile: clicca un giorno" },
  { href: "/avvisi", label: "Avvisi", description: "Comunicazioni per tutti" },
  { href: "/corsi", label: "Materie", description: "Tutti gli insegnamenti" },
  { href: "/carica", label: "Carica materiale", description: "Pubblica slide o appunti" },
];

/**
 * Primary navigation. With enough room it is a plain row of links; when space
 * runs out (small screens) every option is inside one dropdown, so nothing is
 * ever cut off or hidden behind sideways scrolling.
 */
export function NavMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Remember which route the menu was opened on: navigating away closes it
  // without needing an effect to set state.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const isOpen = open && openedOn === pathname;

  // Close on outside click and on Escape.
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // A route change means the dropdown did its job.
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Wide layout: all five options visible. */}
      <nav aria-label="Principale" className="hidden shrink-0 items-center gap-0.5 text-sm lg:flex">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`rounded-lg px-2.5 py-2 transition-colors ${
              isActive(link.href) ? "bg-surface-3 text-strong" : "text-muted hover:bg-surface-2 hover:text-strong"
            } ${link.href === "/carica" ? "ml-1 bg-surface-3 font-medium text-strong hover:bg-surface-3" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Narrow layout: everything lives in one dropdown that fills the screen width. */}
      <div ref={wrapper} className="relative shrink-0 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setOpen(!isOpen);
            setOpenedOn(pathname);
          }}
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-haspopup="menu"
          aria-label="Apri il menu di navigazione"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line-strong bg-surface-3 px-3 text-sm font-semibold text-strong transition-colors hover:bg-surface-3"
        >
          Menu
          <span aria-hidden className={`text-[10px] transition-transform ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div
            id={menuId}
            role="menu"
            className="fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl shadow-black/60 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(92vw,22rem)]"
          >
            <ul className="py-1">
              {LINKS.map((link) => (
                <li key={link.href} role="none">
                  <Link
                    role="menuitem"
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                      isActive(link.href) ? "bg-brand-500/15 text-strong" : "text-body hover:bg-surface-2 hover:text-strong"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{link.label}</span>
                      <span className="mt-0.5 block text-[11px] text-faint">{link.description}</span>
                    </span>
                    <span aria-hidden className="shrink-0 text-faint">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/admin"
              onClick={() => {
                setOpen(false);
              }}
              className="block border-t border-line px-4 py-3 text-xs text-faint hover:text-strong"
            >
              Amministrazione
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
