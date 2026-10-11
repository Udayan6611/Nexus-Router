import type { Block, Extracted } from "../blocks";
import { splitLines } from "../blocks";
import { normalizeText } from "../normalizeText";

/** Plain text / pasted text: paragraphs are runs of non-blank lines; text is kept as-is. */
export function extractText(raw: string): Extracted {
  const text = normalizeText(raw, "text");
  const blocks: Block[] = [];
  let start = -1;
  let end = -1;
  for (const line of splitLines(text)) {
    if (line.text.trim() === "") {
      if (start >= 0) {
        blocks.push({ kind: "paragraph", start, end, headingPath: [] });
        start = -1;
      }
    } else {
      if (start < 0) start = line.start;
      end = line.end;
    }
  }
  if (start >= 0) blocks.push({ kind: "paragraph", start, end, headingPath: [] });
  return { text, blocks, warnings: [] };
}
