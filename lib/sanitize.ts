/**
 * Strip directories and control characters; keep accented letters intact.
 * Unsafe path punctuation is replaced so the resulting key is portable.
 */
const MAX_NAME = 180;

export function sanitizeFileName(input: string): string {
  const base = input.split(/[/\\]/).pop() ?? "file";
  const parts: string[] = [];
  for (const char of base) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) continue;
    parts.push(/[<>:"|?*]/.test(char) ? "-" : char);
  }
  const cleaned = parts.join("").normalize("NFC").trim().slice(0, MAX_NAME);
  return cleaned || "file";
}
