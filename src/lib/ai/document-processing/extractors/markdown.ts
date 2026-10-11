import { HeadingStack, splitLines, type Block, type Extracted, type Line } from "../blocks";
import { normalizeText } from "../normalizeText";

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ATX = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-{2,})[ \t]*$/;
const THEMATIC = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const TABLE_SEP = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+\S/;

/**
 * Markdown is kept verbatim (syntax, code and tables intact). It is only
 * scanned to find block boundaries and the heading hierarchy.
 */
export function extractMarkdown(raw: string): Extracted {
  const text = normalizeText(raw, "markdown");
  const lines = splitLines(text);
  const blocks: Block[] = [];
  const headings = new HeadingStack();
  let currentPath: string[] = [];

  const push = (kind: Block["kind"], start: number, end: number) => {
    blocks.push({ kind, start, end, headingPath: currentPath });
  };
  const pushHeading = (start: number, end: number, level: number, title: string) => {
    currentPath = headings.push(level, title);
    blocks.push({ kind: "heading", start, end, headingPath: currentPath, level });
  };
  const blank = (l: Line) => l.text.trim() === "";
  const startsSpecial = (l: Line, nextLine?: Line) =>
    FENCE.test(l.text) ||
    ATX.test(l.text) ||
    THEMATIC.test(l.text) ||
    LIST_ITEM.test(l.text) ||
    (l.text.includes("|") && nextLine !== undefined && TABLE_SEP.test(nextLine.text));

  let i = 0;

  // YAML front matter
  if (lines[0]?.text === "---") {
    for (let j = 1; j < lines.length; j++) {
      if (lines[j]!.text === "---" || lines[j]!.text === "...") {
        push("paragraph", lines[0].start, lines[j]!.end);
        i = j + 1;
        break;
      }
    }
  }

  while (i < lines.length) {
    const line = lines[i]!;
    if (blank(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line.text);
    if (fence) {
      const marker = fence[1]!;
      const closing = new RegExp(`^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}[ \\t]*$`);
      let j = i + 1;
      while (j < lines.length && !closing.test(lines[j]!.text)) j++;
      const last = j < lines.length ? lines[j]! : lines[lines.length - 1]!;
      push("code", line.start, last.end);
      i = j + 1;
      continue;
    }

    const atx = ATX.exec(line.text);
    if (atx) {
      pushHeading(line.start, line.end, atx[1]!.length, atx[2]!.trim() || "(untitled)");
      i++;
      continue;
    }

    if (THEMATIC.test(line.text)) {
      push("paragraph", line.start, line.end);
      i++;
      continue;
    }

    const next = lines[i + 1];
    if (line.text.includes("|") && next && TABLE_SEP.test(next.text)) {
      let j = i + 2;
      while (j < lines.length && !blank(lines[j]!) && lines[j]!.text.includes("|")) j++;
      push("table", line.start, lines[j - 1]!.end);
      i = j;
      continue;
    }

    if (LIST_ITEM.test(line.text)) {
      let j = i + 1;
      while (
        j < lines.length &&
        !blank(lines[j]!) &&
        !FENCE.test(lines[j]!.text) &&
        !ATX.test(lines[j]!.text)
      ) {
        j++;
      }
      push("list", line.start, lines[j - 1]!.end);
      i = j;
      continue;
    }

    // Paragraph, possibly a setext heading.
    let j = i;
    let setextLevel = 0;
    while (j < lines.length && !blank(lines[j]!)) {
      if (j > i) {
        const m = SETEXT.exec(lines[j]!.text);
        if (m) {
          setextLevel = m[1]!.startsWith("=") ? 1 : 2;
          break;
        }
        if (startsSpecial(lines[j]!, lines[j + 1])) break;
      }
      j++;
    }
    if (setextLevel > 0) {
      const title = lines
        .slice(i, j)
        .map((l: Line) => l.text.trim())
        .join(" ");
      pushHeading(line.start, lines[j]!.end, setextLevel, title);
      i = j + 1;
    } else {
      push("paragraph", line.start, lines[j - 1]!.end);
      i = j;
    }
  }

  return { text, blocks, warnings: [] };
}
