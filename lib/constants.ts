export const ACADEMIC_YEAR = "2026/2027";

export const SEMESTERS = {
  1: { label: "I semestre", start: "2026-09-28", end: "2027-01-16" },
  2: { label: "II semestre", start: "2027-02-23", end: "2027-06-05" },
} as const;

export const TIMEZONE = "Europe/Rome";

export const YEAR_LABELS: Record<number, string> = {
  1: "Primo anno",
  2: "Secondo anno",
  3: "Terzo anno",
  0: "Materie a scelta",
};

export const CURRICULUM_LABELS: Record<string, { label: string; description: string }> = {
  giuridico: { label: "Percorso giuridico", description: "Diritto pubblico comparato, Diritto internazionale, Diritto processuale penale" },
  "storico-politico": { label: "Percorso storico-politico", description: "Relazioni internazionali, Global History, Geopolitica" },
  economico: { label: "Percorso economico", description: "Economia internazionale, Big Data, Economia Pubblica" },
};

/**
 * 200 MB per file. Uploads go straight from the browser to R2 with a presigned
 * PUT, so the file never passes through Vercel's function body limit — the
 * only ceiling is what R2 accepts in a single PUT, and what the CORS policy
 * allows. Downloads of large media stream via a presigned URL.
 */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "odt", "odp", "rtf",
  "txt", "md", "csv", "xls", "xlsx", "ods",
  "jpg", "jpeg", "png", "webp", "gif", "heic",
  "mp3", "m4a", "wav", "mp4", "mov", "zip",
] as const;

export const SOURCE_URLS = {
  site: "https://scienzepolitiche.uniroma2.it/didattica-2/",
  semesterOne: "https://scienzepolitiche.uniroma2.it/lezioni-1-semestre/",
  semesterTwo: "https://scienzepolitiche.uniroma2.it/lezioni-2-semestre/",
  manifesto: "https://scienzepolitiche.uniroma2.it/pagina-2/",
};

/**
 * Who made the site, shown in the footer. Kept here so the links can change in
 * one place. The Play Store link is Conversery's real listing (package
 * com.nomantic.conversery), not a guessed URL.
 */
export const DEVELOPER = {
  instagramHandle: "@the.avalancher",
  instagramUrl: "https://www.instagram.com/the.avalancher/",
  converseryUrl: "https://conversery.com",
  converseryPlayUrl: "https://play.google.com/store/apps/details?id=com.nomantic.conversery",
};
