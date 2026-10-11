import { z } from "zod";
import {
  fail,
  ok,
  type DocumentInput,
  type Result,
  type SourceType,
} from "./contracts";
import type { DocumentLimits } from "./config";

const idSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[^\u0000-\u001F\u007F]+$/);

const ids = {
  documentId: idSchema,
  userId: idSchema,
  sessionId: idSchema,
};

const InputSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("file"),
      ...ids,
      filename: z.string().min(1).max(1024),
      mimeType: z.string().max(255).optional(),
      bytes: z.instanceof(Uint8Array),
    })
    .strict(),
  z
    .object({
      mode: z.literal("text"),
      ...ids,
      text: z.string(),
      format: z.enum(["text", "markdown"]).optional(),
      filename: z.string().max(1024).optional(),
    })
    .strict(),
]);

export interface ValidatedInput {
  sourceType: SourceType;
  documentId: string;
  userId: string;
  sessionId: string;
  filename?: string;
  /** Present for pasted text and for UTF-8 text formats (md, html, txt). */
  text?: string;
  /** Present for pdf and docx. */
  bytes?: Uint8Array;
}

const EXTENSION_FORMATS: Record<string, SourceType> = {
  pdf: "pdf",
  md: "markdown",
  markdown: "markdown",
  html: "html",
  htm: "html",
  docx: "docx",
  txt: "text",
  text: "text",
};

const MIME_FORMATS: Record<string, SourceType> = {
  "application/pdf": "pdf",
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
  "text/html": "html",
  "application/xhtml+xml": "html",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "text",
};

export function sanitizeFilename(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 255);
  return clean === "" ? undefined : clean;
}

function extensionFormat(filename: string): SourceType | undefined {
  const base = sanitizeFilename(filename) ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return undefined;
  return EXTENSION_FORMATS[base.slice(dot + 1).toLowerCase()];
}

function mimeFormat(mime: string | undefined): SourceType | undefined {
  if (!mime) return undefined;
  const essence = mime.split(";")[0]!.trim().toLowerCase();
  return MIME_FORMATS[essence];
}

/** text/plain is a common, harmless label for .md files. */
function compatible(ext: SourceType, mime: SourceType): boolean {
  return ext === mime || (mime === "text" && ext === "markdown");
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  // The PDF spec allows the header anywhere in the first 1024 bytes.
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function hasZipSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06)
  );
}

function hasNulByte(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8192);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

function looksLikeHtml(text: string): boolean {
  return /^\s*(<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>])/i.test(text.slice(0, 2048));
}

function validateFile(
  base: Omit<ValidatedInput, "sourceType">,
  input: Extract<DocumentInput, { mode: "file" }>,
  limits: DocumentLimits,
): Result<ValidatedInput> {
  const { bytes } = input;
  if (bytes.length === 0) return fail("EMPTY_CONTENT", "The file is empty.");
  if (bytes.length > limits.maxFileBytes) {
    return fail("FILE_TOO_LARGE", `The file exceeds the ${limits.maxFileBytes}-byte limit.`);
  }

  const ext = extensionFormat(input.filename);
  const mime = mimeFormat(input.mimeType);
  if (ext && mime && !compatible(ext, mime)) {
    return fail(
      "FORMAT_MISMATCH",
      "The declared content type does not match the file extension.",
    );
  }
  const declared = ext ?? mime;

  if (hasPdfSignature(bytes)) {
    if (declared && declared !== "pdf") {
      return fail("FORMAT_MISMATCH", "The file content is a PDF but it was declared as another format.");
    }
    return ok({ ...base, sourceType: "pdf", bytes });
  }

  if (hasZipSignature(bytes)) {
    if (declared !== "docx") {
      return fail(
        declared ? "FORMAT_MISMATCH" : "UNSUPPORTED_FORMAT",
        "The file is a ZIP container; only DOCX is supported.",
      );
    }
    return ok({ ...base, sourceType: "docx", bytes });
  }

  if (declared === "pdf" || declared === "docx") {
    return fail("FORMAT_MISMATCH", `The file content is not a valid ${declared.toUpperCase()}.`);
  }
  if (hasNulByte(bytes)) {
    return fail("UNSUPPORTED_FORMAT", "Binary content is not supported; text files must be UTF-8.");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("UNSUPPORTED_FORMAT", "Text files must be valid UTF-8.");
  }

  const sourceType: SourceType | undefined = declared ?? (looksLikeHtml(text) ? "html" : undefined);
  if (!sourceType) {
    return fail(
      "UNSUPPORTED_FORMAT",
      "Could not determine the file format; supported: PDF, Markdown, HTML, DOCX, plain text.",
    );
  }
  return ok({ ...base, sourceType, text });
}

/**
 * Validation sequence: request shape -> byte limit -> extension and declared
 * MIME agreement -> actual signature/content -> supported format.
 * Error messages never include file or pasted content.
 */
export function validateInput(
  raw: unknown,
  limits: DocumentLimits,
): Result<ValidatedInput> {
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".") || "input"))];
    return fail("INVALID_INPUT", `Invalid document input (fields: ${fields.join(", ")}).`);
  }
  const input = parsed.data as DocumentInput;
  const base = {
    documentId: input.documentId,
    userId: input.userId,
    sessionId: input.sessionId,
    ...(sanitizeFilename(input.filename) !== undefined
      ? { filename: sanitizeFilename(input.filename)! }
      : {}),
  };

  if (input.mode === "text") {
    if (input.text.length > limits.maxExtractedChars) {
      return fail("TEXT_TOO_LARGE", `Pasted text exceeds the ${limits.maxExtractedChars}-character limit.`);
    }
    if (input.text.trim() === "") return fail("EMPTY_CONTENT", "The pasted text is empty.");
    return ok({ ...base, sourceType: input.format === "markdown" ? "markdown" : "text", text: input.text });
  }
  return validateFile(base, input, limits);
}
