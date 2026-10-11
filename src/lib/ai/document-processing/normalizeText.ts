/**
 * Safe, non-destructive normalization. Runs before block offsets are
 * computed, so offsets always refer to the normalized text.
 *
 * Deliberately NOT done: de-hyphenation, NFKC folding, whitespace collapsing
 * inside Markdown/code, or removing repeated headers/footers. Each can change
 * meaning or silently drop content.
 */

export type NormalizeMode = "markdown" | "text" | "pdf";

/** Line endings, control characters and invisible extraction artifacts. */
export function normalizeBasic(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B\u00AD]/g, ""); // zero-width space, soft hyphen (ZWJ/ZWNJ kept: Indic scripts)
}

export function normalizeText(raw: string, mode: NormalizeMode): string {
  const basic = normalizeBasic(raw);
  switch (mode) {
    case "markdown":
      // Markdown syntax, code and tables are left untouched.
      return basic.replace(/^\n+/, "").replace(/\s+$/, "");
    case "text":
      return basic
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\n+/, "")
        .replace(/\s+$/, "");
    case "pdf":
      return basic
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/[ \t]+$/gm, "")
        .replace(/^[ \t]+/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\n+/, "")
        .replace(/\s+$/, "");
  }
}
