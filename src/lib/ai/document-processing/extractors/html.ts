import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";
import { BlockBuilder, type Extracted } from "../blocks";
import { DocumentProcessingError } from "../errors";
import { normalizeBasic } from "../normalizeText";

/**
 * HTML is parsed, never rendered or executed. Output is plain text with
 * light Markdown-style structure (#, -, |, ```), so scripts, styles, event
 * attributes and link targets cannot reach downstream consumers.
 *
 * Removed elements: script, style, noscript, template, iframe, object, embed,
 * svg, canvas, head, link, meta, and comments. Images are skipped (no alt text).
 */

const REMOVED = new Set([
  "script", "style", "noscript", "template", "iframe", "object", "embed",
  "svg", "canvas", "head", "link", "meta", "title", "base", "applet",
]);

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const LISTS = new Set(["ul", "ol"]);
const CONTAINERS = new Set([
  "html", "body", "div", "section", "article", "main", "header", "footer", "nav",
  "aside", "form", "fieldset", "details", "figure", "dl", "address", "blockquote",
  "center", "hgroup", "menu", "dir", "tbody", "thead", "tfoot",
]);
const TEXT_BLOCKS = new Set([
  "p", "dt", "dd", "figcaption", "summary", "caption", "legend", "li", "pre",
]);
const BLOCK_TAGS = new Set([
  ...HEADINGS, ...LISTS, ...CONTAINERS, ...TEXT_BLOCKS, "table", "hr", "tr",
]);

const BR = "";
const MAX_DEPTH = 256;

function isElement(n: ChildNode): n is Element {
  return n.type === "tag" || n.type === "script" || n.type === "style";
}

function isText(n: ChildNode): n is ChildNode & { data: string } {
  return n.type === "text";
}

export function extractHtml(raw: string): Extracted {
  const html = normalizeBasic(raw);
  const doc = parseDocument(html, { decodeEntities: true });
  const builder = new BlockBuilder();
  const blockCache = new WeakMap<Element, boolean>();

  const containsBlock = (el: Element, depth: number): boolean => {
    const cached = blockCache.get(el);
    if (cached !== undefined) return cached;
    if (depth > MAX_DEPTH) throw tooDeep();
    let found = false;
    for (const c of el.children as ChildNode[]) {
      if (isElement(c) && !REMOVED.has(c.name) && (BLOCK_TAGS.has(c.name) || c.name === "table" || containsBlock(c, depth + 1))) {
        found = true;
        break;
      }
    }
    blockCache.set(el, found);
    return found;
  };

  const collapse = (s: string): string =>
    s
      .replace(/[ \t\r\n\f]+/g, " ")
      .replace(new RegExp(` ?${BR} ?`, "g"), "\n")
      .trim();

  /** Whitespace-collapsed text of a subtree. */
  const inline = (nodes: ChildNode[], depth: number, skipLists = false): string => {
    if (depth > MAX_DEPTH) throw tooDeep();
    let out = "";
    for (const n of nodes) {
      if (isText(n)) {
        out += n.data;
      } else if (isElement(n)) {
        if (REMOVED.has(n.name) || n.name === "img") continue;
        if (n.name === "br") out += BR;
        else if (skipLists && LISTS.has(n.name)) continue;
        else if (BLOCK_TAGS.has(n.name) || n.name === "table") out += " " + inline(n.children as ChildNode[], depth + 1, skipLists) + " ";
        else out += inline(n.children as ChildNode[], depth + 1, skipLists);
      }
    }
    return out;
  };

  const rawText = (nodes: ChildNode[], depth: number): string => {
    if (depth > MAX_DEPTH) throw tooDeep();
    let out = "";
    for (const n of nodes) {
      if (isText(n)) out += n.data;
      else if (isElement(n) && !REMOVED.has(n.name)) {
        out += n.name === "br" ? "\n" : rawText(n.children as ChildNode[], depth + 1);
      }
    }
    return out;
  };

  const cell = (el: Element, depth: number): string =>
    collapse(inline(el.children as ChildNode[], depth)).replace(/\n/g, " ").replace(/\|/g, "\\|");

  const renderTable = (table: Element, depth: number): string => {
    const rows: Element[] = [];
    const collect = (nodes: ChildNode[], d: number) => {
      if (d > MAX_DEPTH) throw tooDeep();
      for (const n of nodes) {
        if (!isElement(n) || REMOVED.has(n.name)) continue;
        if (n.name === "tr") rows.push(n);
        else if (n.name !== "table") collect(n.children as ChildNode[], d + 1);
      }
    };
    collect(table.children as ChildNode[], depth);
    const lines: string[] = [];
    rows.forEach((row, idx) => {
      const cells = (row.children as ChildNode[]).filter(
        (c): c is Element => isElement(c) && (c.name === "td" || c.name === "th"),
      );
      if (cells.length === 0) return;
      lines.push(`| ${cells.map((c) => cell(c, depth + 1)).join(" | ")} |`);
      if (idx === 0 && cells.some((c) => c.name === "th")) {
        lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
      }
    });
    return lines.join("\n");
  };

  const renderList = (list: Element, depth: number, level: number): string[] => {
    if (depth > MAX_DEPTH) throw tooDeep();
    const lines: string[] = [];
    let n = 0;
    for (const item of list.children as ChildNode[]) {
      if (!isElement(item) || item.name !== "li") continue;
      n++;
      const marker = list.name === "ol" ? `${n}.` : "-";
      const text = collapse(inline(item.children as ChildNode[], depth + 1, true));
      if (text) lines.push(`${"  ".repeat(level)}${marker} ${text.replace(/\n/g, " ")}`);
      for (const child of item.children as ChildNode[]) {
        if (isElement(child) && LISTS.has(child.name)) {
          lines.push(...renderList(child, depth + 1, level + 1));
        }
      }
    }
    return lines;
  };

  const walk = (nodes: ChildNode[], depth: number): void => {
    if (depth > MAX_DEPTH) throw tooDeep();
    let buf = "";
    const flush = () => {
      const t = collapse(buf);
      if (t) builder.add("paragraph", t);
      buf = "";
    };

    for (const n of nodes) {
      if (isText(n)) {
        buf += n.data;
        continue;
      }
      if (!isElement(n) || REMOVED.has(n.name) || n.name === "img") continue;
      const name = n.name;
      const kids = n.children as ChildNode[];

      if (name === "br") {
        buf += BR;
      } else if (HEADINGS.has(name)) {
        flush();
        const level = Number(name[1]);
        const title = collapse(inline(kids, depth + 1)).replace(/\n/g, " ");
        if (title) builder.add("heading", `${"#".repeat(level)} ${title}`, { level, title });
      } else if (name === "pre") {
        flush();
        const code = rawText(kids, depth + 1).replace(/^\n+/, "").replace(/\s+$/, "");
        if (code.trim()) builder.add("code", "```\n" + code + "\n```");
      } else if (LISTS.has(name)) {
        flush();
        const lines = renderList(n, depth, 0);
        if (lines.length) builder.add("list", lines.join("\n"));
      } else if (name === "table") {
        flush();
        const t = renderTable(n, depth);
        if (t) builder.add("table", t);
      } else if (name === "hr") {
        flush();
      } else if (name === "li") {
        flush();
        const t = collapse(inline(kids, depth + 1)).replace(/\n/g, " ");
        if (t) builder.add("list", `- ${t}`);
      } else if (CONTAINERS.has(name) || (TEXT_BLOCKS.has(name) && containsBlock(n, depth))) {
        flush();
        walk(kids, depth + 1);
      } else if (TEXT_BLOCKS.has(name)) {
        flush();
        const t = collapse(inline(kids, depth + 1));
        if (t) builder.add("paragraph", t);
      } else if (containsBlock(n, depth)) {
        // Inline wrapper (e.g. <a><div>..</div></a>) that holds block content.
        flush();
        walk(kids, depth + 1);
      } else {
        buf += inline(kids, depth + 1);
      }
    }
    flush();
  };

  try {
    walk(doc.children as ChildNode[], 0);
  } catch (e) {
    if (e instanceof RangeError) throw tooDeep();
    throw e;
  }

  const { text, blocks } = builder.build();
  return { text, blocks, warnings: [] };
}

function tooDeep(): DocumentProcessingError {
  return new DocumentProcessingError("CORRUPT_FILE", "The HTML is nested too deeply to process safely.");
}
