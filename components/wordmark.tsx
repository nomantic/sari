import Link from "next/link";

/**
 * The SARI wordmark: a typographic logotype, not a badge.
 *
 * An elegant display serif set in wide capitals, with a hairline rule and the
 * full course name in small caps beneath it. It scales from the phone header
 * (where only "SARI" shows) to desktop (where the subtitle appears too).
 */
export function Wordmark({ showSubtitle = true }: { showSubtitle?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="SARI — Scienze dell'Amministrazione e delle Relazioni Internazionali, pagina iniziale"
      className="group flex shrink-0 flex-col justify-center leading-none"
    >
      <span className="wordmark text-[1.4rem] transition-opacity group-hover:opacity-80 sm:text-[1.55rem]">SARI</span>
      {showSubtitle && (
        <>
          <span className="wordmark-rule mt-1 hidden h-px w-full opacity-60 sm:block" aria-hidden />
          <span className="mt-1 hidden text-[9px] font-medium uppercase leading-tight tracking-[0.14em] text-faint lg:block">
            Scienze dell&apos;Amministrazione
            <br />e delle Relazioni Internazionali
          </span>
        </>
      )}
    </Link>
  );
}
