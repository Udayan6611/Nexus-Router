import { chunkDocument } from "./chunkDocument";
import {
  resolveConfig,
  type DocumentProcessingConfigOverrides,
} from "./config";
import {
  fail,
  ok,
  type DocumentInput,
  type ExtractedDocument,
  type Result,
} from "./contracts";
import { DocumentProcessingError } from "./errors";
import type { Extracted } from "./blocks";
import { extractDocx } from "./extractors/docx";
import { extractHtml } from "./extractors/html";
import { extractMarkdown } from "./extractors/markdown";
import { extractPdf } from "./extractors/pdf";
import { extractText } from "./extractors/text";
import { validateInput } from "./validateInput";

export interface ExtractDocumentOptions {
  config?: DocumentProcessingConfigOverrides;
}

/**
 * Validates, extracts, normalizes and chunks a file or pasted text.
 *
 * Never throws and never logs. Error messages never contain document text.
 * `userId` / `sessionId` must come from the trusted auth context; they are
 * attached to the document and every chunk so the repository layer can
 * enforce isolation (see isolation.ts). Persistence is not done here.
 */
export async function extractDocument(
  input: DocumentInput,
  options: ExtractDocumentOptions = {},
): Promise<Result<ExtractedDocument>> {
  try {
    const { limits, chunking } = resolveConfig(options.config);

    const validated = validateInput(input, limits);
    if (!validated.ok) return validated;
    const v = validated.data;

    let extracted: Extracted;
    switch (v.sourceType) {
      case "pdf":
        extracted = await extractPdf(v.bytes!, limits);
        break;
      case "docx":
        extracted = await extractDocx(v.bytes!, limits);
        break;
      case "html":
        extracted = extractHtml(v.text!);
        break;
      case "markdown":
        extracted = extractMarkdown(v.text!);
        break;
      case "text":
        extracted = extractText(v.text!);
        break;
    }

    if (extracted.text.length > limits.maxExtractedChars) {
      return fail("TEXT_TOO_LARGE", `Extracted text exceeds the ${limits.maxExtractedChars}-character limit.`);
    }
    if (extracted.text.trim() === "" || extracted.blocks.length === 0) {
      return fail("EMPTY_CONTENT", "No extractable text was found in the document.");
    }

    const chunks = chunkDocument({
      documentId: v.documentId,
      userId: v.userId,
      sessionId: v.sessionId,
      sourceType: v.sourceType,
      text: extracted.text,
      blocks: extracted.blocks,
      chunking,
    });

    const doc: ExtractedDocument = {
      documentId: v.documentId,
      userId: v.userId,
      sessionId: v.sessionId,
      sourceType: v.sourceType,
      extractedText: extracted.text,
      chunks,
      warnings: extracted.warnings,
    };
    if (v.filename !== undefined) doc.filename = v.filename;
    if (extracted.pageCount !== undefined) doc.pageCount = extracted.pageCount;
    return ok(doc);
  } catch (e) {
    if (e instanceof DocumentProcessingError) return fail(e.code, e.message);
    return fail("INTERNAL_ERROR", "Document processing failed unexpectedly.");
  }
}
