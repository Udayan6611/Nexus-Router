import type { Block } from "./blocks";
import type { ChunkingConfig } from "./config";
import type { ChunkMetadata, DocumentChunk, DocumentOwner, SourceType } from "./contracts";

/**
 * Structure-aware chunker.
 *
 * Every chunk is a contiguous slice of `extractedText` (`text === slice(start, end)`),
 * so offsets are exact and nothing can be silently dropped: concatenating
 * `chunk0.text` with `chunk[i].text.slice(overlapChars)` for i >= 1 reproduces
 * the text from the first block to the last block.
 *
 * Boundaries, in order of preference: headings (a heading always stays with
 * the content it introduces) -> blocks/paragraphs -> sentences -> lines ->
 * whitespace -> a hard cut as a last resort. Code blocks and tables stay
 * intact unless they exceed the maximum size. Sizes are estimated tokens
 * (chars / charsPerToken).
 */

interface Unit {
  start: number;
  end: number;
  /** Block whose page and heading path describe where this unit's content begins. */
  meta: Block;
  last: Block;
  startsWithHeading: boolean;
}

interface Core {
  start: number;
  end: number;
  meta: Block;
  last: Block;
}

export interface ChunkDocumentArgs extends DocumentOwner {
  documentId: string;
  sourceType: SourceType;
  text: string;
  blocks: Block[];
  chunking: ChunkingConfig;
}

const isWs = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);

function buildUnits(blocks: Block[]): Unit[] {
  const units: Unit[] = [];
  let pending: Block[] = [];
  for (const b of blocks) {
    if (b.kind === "heading") {
      pending.push(b);
      continue;
    }
    const first = pending[0] ?? b;
    units.push({ start: first.start, end: b.end, meta: b, last: b, startsWithHeading: pending.length > 0 });
    pending = [];
  }
  if (pending.length > 0) {
    const first = pending[0]!;
    const last = pending[pending.length - 1]!;
    units.push({ start: first.start, end: last.end, meta: last, last, startsWithHeading: true });
  }
  return units;
}

function findCut(text: string, pos: number, hardEnd: number, preferLines: boolean): number {
  const lo = pos + Math.floor((hardEnd - pos) / 2);
  const finders: Array<(i: number) => number> = [];
  const paragraph = (i: number) => (text[i - 1] === "\n" && text[i - 2] === "\n" ? i - 2 : -1);
  const line = (i: number) => (text[i] === "\n" ? i : -1);
  const sentence = (i: number) => (/[.!?。！？]/.test(text[i - 1] ?? "") && isWs(text[i]) ? i : -1);
  const space = (i: number) => (text[i] === " " || text[i] === "\t" ? i : -1);
  finders.push(paragraph, ...(preferLines ? [line, sentence] : [sentence, line]), space);

  for (const find of finders) {
    for (let i = hardEnd; i > lo; i--) {
      const cut = find(i);
      if (cut > pos) return cut;
    }
  }
  let cut = hardEnd;
  const prev = text.charCodeAt(cut - 1);
  if (prev >= 0xd800 && prev <= 0xdbff) cut -= 1; // never split a surrogate pair
  return cut > pos ? cut : Math.min(pos + 1, hardEnd);
}

/** Splits [s, e) into pieces of at most `limit` chars. Always makes progress. */
function splitRange(text: string, s: number, e: number, limit: number, preferLines: boolean): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let pos = s;
  while (pos < e) {
    while (pos < e && isWs(text[pos])) pos++;
    if (pos >= e) break;
    let end = e - pos <= limit ? e : findCut(text, pos, pos + limit, preferLines);
    while (end > pos && isWs(text[end - 1])) end--;
    if (end <= pos) end = Math.min(pos + 1, e);
    out.push([pos, end]);
    pos = end;
  }
  return out;
}

function snapOverlapStart(text: string, from: number, to: number): number | undefined {
  const skipWs = (q: number) => {
    while (q < to && isWs(text[q])) q++;
    return q;
  };
  const para = text.indexOf("\n\n", from);
  if (para >= 0) {
    const q = skipWs(para + 2);
    if (q < to) return q;
  }
  const sentence = /[.!?。！？]["')\]]*\s+/g;
  sentence.lastIndex = from;
  const m = sentence.exec(text);
  if (m) {
    const q = skipWs(m.index + m[0].length);
    if (q < to) return q;
  }
  for (let i = from; i < to; i++) {
    if (isWs(text[i])) {
      const q = skipWs(i);
      return q < to ? q : undefined;
    }
  }
  return undefined;
}

export function chunkDocument(args: ChunkDocumentArgs): DocumentChunk[] {
  const { text, blocks, chunking: c } = args;
  const target = Math.floor(c.targetTokens * c.charsPerToken);
  const max = Math.floor(c.maxTokens * c.charsPerToken);
  const min = Math.floor(c.minTokens * c.charsPerToken);
  const overlap = Math.floor(c.overlapTokens * c.charsPerToken);

  const cores: Core[] = [];
  let cur: Core | undefined;
  const commit = (core: Core | undefined) => {
    if (core) cores.push(core);
  };

  for (const u of buildUnits(blocks)) {
    if (u.end - u.start > max) {
      commit(cur);
      cur = undefined;
      const preferLines = u.meta.kind === "code" || u.meta.kind === "table";
      for (const [s, e] of splitRange(text, u.start, u.end, target, preferLines)) {
        cores.push({ start: s, end: e, meta: u.meta, last: u.last });
      }
      continue;
    }
    if (!cur) {
      cur = { start: u.start, end: u.end, meta: u.meta, last: u.last };
      continue;
    }
    const curLen = cur.end - cur.start;
    const newLen = u.end - cur.start;
    const sizeFlush = newLen > target && !(curLen < min && newLen <= max);
    const headingFlush = u.startsWithHeading && curLen >= min;
    if (sizeFlush || headingFlush) {
      commit(cur);
      cur = { start: u.start, end: u.end, meta: u.meta, last: u.last };
    } else {
      cur.end = u.end;
      cur.last = u.last;
    }
  }
  commit(cur);

  // Fold a tiny trailing chunk into its predecessor when the result still fits.
  if (cores.length >= 2) {
    const last = cores[cores.length - 1]!;
    const prev = cores[cores.length - 2]!;
    if (last.end - last.start < min && last.end - prev.start <= max) {
      prev.end = last.end;
      prev.last = last.last;
      cores.pop();
    }
  }

  return cores.map((core, i): DocumentChunk => {
    let start = core.start;
    let overlapChars = 0;
    if (i > 0) {
      const prev = cores[i - 1]!;
      const k = Math.min(overlap, Math.floor((prev.end - prev.start) / 2), max - (core.end - core.start));
      if (k > 0) {
        const s = snapOverlapStart(text, prev.end - k, prev.end);
        if (s !== undefined) {
          start = s;
          overlapChars = prev.end - s;
        }
      }
    }
    const chunkText = text.slice(start, core.end);
    const metadata: ChunkMetadata = {
      sourceType: args.sourceType,
      headingPath: [...core.meta.headingPath],
      startOffset: start,
      endOffset: core.end,
      overlapChars,
      estimatedTokens: Math.ceil(chunkText.length / c.charsPerToken),
    };
    if (core.meta.pageNumber !== undefined) metadata.pageNumber = core.meta.pageNumber;
    if (core.last.pageNumber !== undefined && core.last.pageNumber !== core.meta.pageNumber) {
      metadata.endPageNumber = core.last.pageNumber;
    }
    return {
      chunkId: `${args.documentId}:${i}`,
      documentId: args.documentId,
      userId: args.userId,
      sessionId: args.sessionId,
      chunkIndex: i,
      text: chunkText,
      metadata,
    };
  });
}
