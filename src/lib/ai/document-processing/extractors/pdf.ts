import { getDocumentProxy } from "unpdf";
import { BlockBuilder, type Extracted } from "../blocks";
import type { DocumentLimits } from "../config";
import { DocumentProcessingError } from "../errors";
import { normalizeText } from "../normalizeText";

interface PdfTextItem {
  str: string;
  hasEOL?: boolean;
  height?: number;
  transform?: number[];
  width?: number;
}

const SCANNED_MESSAGE =
  "The PDF has no extractable text and is likely scanned or image-only. OCR is not supported yet.";

function pageText(items: unknown[]): string {
  let out = "";
  let prevY: number | undefined;
  let prevEndX: number | undefined;
  for (const raw of items) {
    if (!raw || typeof raw !== "object" || !("str" in raw)) continue;
    const it = raw as PdfTextItem;
    const x = it.transform?.[4];
    const y = it.transform?.[5];
    const h = it.height && it.height > 0 ? it.height : 10;

    if (y !== undefined && prevY !== undefined && out !== "" && !out.endsWith("\n")) {
      if (Math.abs(y - prevY) > h * 0.5) out += "\n";
      else if (
        x !== undefined &&
        prevEndX !== undefined &&
        x - prevEndX > h * 0.2 &&
        !out.endsWith(" ") &&
        !it.str.startsWith(" ")
      ) {
        out += " ";
      }
    }
    out += it.str;
    if (it.hasEOL && !out.endsWith("\n")) out += "\n";
    if (y !== undefined) prevY = y;
    prevEndX = x !== undefined && it.width !== undefined ? x + it.width : undefined;
  }
  return out;
}

export async function extractPdf(bytes: Uint8Array, limits: DocumentLimits): Promise<Extracted> {
  // pdf.js may transfer the buffer to a worker, so give it a copy.
  const data = new Uint8Array(bytes);
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(data, { verbosity: 0 });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    if (name === "PasswordException") {
      throw new DocumentProcessingError("ENCRYPTED_FILE", "The PDF is password-protected.");
    }
    throw new DocumentProcessingError("CORRUPT_FILE", "The PDF is corrupt or unreadable.");
  }

  try {
    const pageCount = pdf.numPages;
    if (pageCount > limits.maxPages) {
      throw new DocumentProcessingError("TOO_MANY_PAGES", `The PDF has more than ${limits.maxPages} pages.`);
    }

    const builder = new BlockBuilder();
    let meaningfulChars = 0;
    let totalChars = 0;
    const emptyPages: number[] = [];

    for (let n = 1; n <= pageCount; n++) {
      let text: string;
      try {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        text = normalizeText(pageText(content.items as unknown[]), "pdf");
      } catch {
        throw new DocumentProcessingError("CORRUPT_FILE", "A PDF page could not be read.");
      }

      const chars = text.replace(/\s/g, "").length;
      meaningfulChars += chars;
      totalChars += text.length;
      if (totalChars > limits.maxExtractedChars) {
        throw new DocumentProcessingError("TEXT_TOO_LARGE", "The extracted PDF text exceeds the allowed size.");
      }
      if (chars === 0) {
        emptyPages.push(n);
        continue;
      }
      for (const para of text.split(/\n{2,}/)) {
        builder.add("paragraph", para, { pageNumber: n });
      }
    }

    const emptyRatio = pageCount === 0 ? 1 : emptyPages.length / pageCount;
    const avgChars = pageCount === 0 ? 0 : meaningfulChars / pageCount;
    if (meaningfulChars === 0 || (emptyRatio >= 0.5 && avgChars < 50)) {
      throw new DocumentProcessingError("SCANNED_PDF", SCANNED_MESSAGE);
    }

    const warnings: string[] = [];
    if (emptyPages.length > 0) {
      const shown = emptyPages.slice(0, 20).join(", ");
      const more = emptyPages.length > 20 ? ` and ${emptyPages.length - 20} more` : "";
      warnings.push(`No extractable text on page(s) ${shown}${more}; they may be scanned or image-only.`);
    }
    const { text, blocks } = builder.build();
    return { text, blocks, pageCount, warnings };
  } finally {
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}
