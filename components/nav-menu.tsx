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
              isActive(link.href) ? "bg-white/10 text-white" : "text-mist-300 hover:bg-white/5 hover:text-white"
            } ${link.href === "/carica" ? "ml-1 bg-white/8 font-medium text-white hover:bg-white/14" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Narrow layout: everything lives in one dropdown. */}
      <div ref={wrapper} className="relative ml-auto shrink-0 lg:hidden">
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/14"
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
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/12 bg-ink-900 shadow-2xl shadow-black/50"
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
                    className={`block px-3 py-2.5 transition-colors ${
                      isActive(link.href) ? "bg-brand-500/15 text-white" : "text-mist-200 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <span className="block text-sm font-medium">{link.label}</span>
                    <span className="mt-0.5 block text-[11px] text-mist-400">{link.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/admin"
              onClick={() => {
                      setOpen(false);
                    }}
              className="block border-t border-white/8 px-3 py-2 text-[11px] text-mist-400 hover:text-white"
            >
              Amministrazione
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
