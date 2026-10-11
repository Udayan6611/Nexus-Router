/** Structure shared by all extractors and consumed by the chunker. */

export type BlockKind = "heading" | "paragraph" | "list" | "code" | "table";

export interface Block {
  kind: BlockKind;
  /** UTF-16 offsets into the extracted text. */
  start: number;
  end: number;
  /** Heading hierarchy in effect at this block (a heading includes itself). */
  headingPath: string[];
  pageNumber?: number;
  level?: number;
}

export interface Extracted {
  text: string;
  blocks: Block[];
  pageCount?: number;
  warnings: string[];
}

interface HeadingEntry {
  level: number;
  title: string;
}

/** Tracks the heading hierarchy as headings of various levels arrive. */
export class HeadingStack {
  private stack: HeadingEntry[] = [];

  push(level: number, title: string): string[] {
    while (this.stack.length > 0 && this.stack[this.stack.length - 1]!.level >= level) {
      this.stack.pop();
    }
    this.stack.push({ level, title });
    return this.path();
  }

  path(): string[] {
    return this.stack.map((h) => h.title);
  }
}

/** Assembles text from parts and records block offsets (blocks joined by a blank line). */
export class BlockBuilder {
  private parts: string[] = [];
  private length = 0;
  private blocks: Block[] = [];
  private headings = new HeadingStack();

  add(
    kind: BlockKind,
    content: string,
    opts: { level?: number; title?: string; pageNumber?: number } = {},
  ): void {
    const body = content.replace(/^\n+/, "").replace(/\s+$/, "");
    if (body.trim() === "") return;
    if (this.length > 0) {
      this.parts.push("\n\n");
      this.length += 2;
    }
    const start = this.length;
    this.parts.push(body);
    this.length += body.length;

    let headingPath: string[];
    if (kind === "heading" && opts.level !== undefined) {
      headingPath = this.headings.push(opts.level, opts.title ?? body);
    } else {
      headingPath = this.headings.path();
    }
    const block: Block = { kind, start, end: this.length, headingPath };
    if (opts.level !== undefined) block.level = opts.level;
    if (opts.pageNumber !== undefined) block.pageNumber = opts.pageNumber;
    this.blocks.push(block);
  }

  build(): { text: string; blocks: Block[] } {
    return { text: this.parts.join(""), blocks: this.blocks };
  }
}

export interface Line {
  text: string;
  start: number;
  /** Exclusive, not including the newline. */
  end: number;
}

export function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  let pos = 0;
  while (pos <= text.length) {
    const nl = text.indexOf("\n", pos);
    const end = nl === -1 ? text.length : nl;
    lines.push({ text: text.slice(pos, end), start: pos, end });
    if (nl === -1) break;
    pos = nl + 1;
  }
  return lines;
}
