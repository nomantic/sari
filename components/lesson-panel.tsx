"use client";

import { useRouter } from "next/navigation";
import { FileList } from "./file-list";
import { NoteEditor } from "./note-editor";
import { Uploader } from "./uploader";
import type { FileRecord } from "@/lib/types";

/**
 * The materials part of a lesson page: what is available, and the upload box.
 * Kept separate from the page so the page itself can stay a server component.
 */
export function LessonPanel({
  sessionId,
  files,
  uploadsEnabled,
  isAdmin,
  sessionLabel,
}: {
  sessionId: string;
  files: FileRecord[];
  uploadsEnabled: boolean;
  isAdmin: boolean;
  sessionLabel: string;
}) {
  const router = useRouter();

  return (
    /* From md (768px) the materials get the wide column and the uploader a fixed
       side column: at that width a stacked full-width dropzone pushed the
       actual materials below the fold. On phones the uploader stays first. */
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label="Materiali della lezione" className="order-2 min-w-0 md:order-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
          Materiali condivisi ({files.length})
        </h2>
        <FileList files={files} isAdmin={isAdmin} />
      </section>

      <section aria-labelledby="carica-lezione" className="order-1 min-w-0 md:order-2">
        <h2 id="carica-lezione" className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
          Carica per questa lezione
        </h2>
        <Uploader
          sessionId={sessionId}
          sessionLabel={sessionLabel}
          disabled={uploadsEnabled ? undefined : true}
          onUploaded={() => router.refresh()}
        />
        {/* Writing a note is the lighter alternative to uploading a file. */}
        <div className="mt-3">
          <NoteEditor
            sessionId={sessionId}
            sessionLabel={sessionLabel}
            disabled={!uploadsEnabled}
            onSaved={() => router.refresh()}
          />
        </div>
      </section>
    </div>
  );
}
