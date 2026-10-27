import type { Metadata } from "next";
import { UploadWizard } from "@/components/upload-wizard";
import { getCatalog } from "@/lib/catalog";
import { YEAR_LABELS } from "@/lib/constants";
import { todayIso } from "@/lib/format";
import { isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carica materiale",
  description: "Carica slide, appunti o registrazioni per una specifica lezione del corso SARI.",
};

export default async function UploadPage() {
  const { courses } = getCatalog();
  const uploadsEnabled = isStorageConfigured() && process.env.UPLOADS_ENABLED !== "false";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Carica materiale</h1>
      <p className="mt-3 text-mist-300">
        Scegli l&apos;insegnamento, poi la <strong className="text-white">data e l&apos;ora</strong> della lezione: il file finisce
        esattamente nella lezione giusta, così tutti lo trovano subito.
      </p>

      <div className="mt-8">
        <UploadWizard
          courses={courses.map((c) => ({
            id: c.id,
            name: c.name,
            short: c.short,
            professors: c.professors,
            year: c.year,
            sessions: c.sessions,
          }))}
          yearLabels={YEAR_LABELS}
          today={todayIso()}
          uploadsEnabled={uploadsEnabled}
        />
      </div>

      <div className="mt-8 rounded-xl border border-white/8 bg-ink-900/50 p-4 text-sm">
        <p className="font-semibold text-white">Regole semplici</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-mist-300">
          <li>Chiunque può caricare e scaricare: il materiale è di tutti.</li>
          <li>Puoi rimuovere un file che hai caricato tu, dal dispositivo da cui l&apos;hai caricato.</li>
          <li>Non caricare materiale protetto da copyright o dati personali sensibili.</li>
          <li>Massimo 50 MB per file.</li>
        </ul>
      </div>
    </div>
  );
}
