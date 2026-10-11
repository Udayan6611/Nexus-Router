/**
 * PROVISIONAL shared contracts for document processing.
 *
 * Replace with re-exports from the backend's shared contracts package once
 * `DocumentInput`, `ExtractedDocument`, `DocumentChunk` and `Result<T>` are
 * finalized. Open questions for the backend owner are listed in README.md
 * (document/chunk ID ownership, stored fields, scope representation).
 */

export const SOURCE_TYPES = ["pdf", "markdown", "html", "docx", "text"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Must come from the trusted server-side auth context, never from the client. */
export interface DocumentOwner {
  userId: string;
  sessionId: string;
}

/** Uploaded file, as bytes received by the server (no browser File object). */
export interface FileDocumentInput extends DocumentOwner {
  mode: "file";
  documentId: string;
  filename: string;
  /** Client-declared content type: a hint, never proof. */
  mimeType?: string;
  bytes: Uint8Array;
}

/** Pasted text, no file bytes. */
export interface PastedTextInput extends DocumentOwner {
  mode: "text";
  documentId: string;
  text: string;
  format?: "text" | "markdown";
  filename?: string;
}

export type DocumentInput = FileDocumentInput | PastedTextInput;

export interface ChunkMetadata {
  sourceType: SourceType;
  /** Page where the chunk's own content begins (PDF only). */
  pageNumber?: number;
  /** Last page the chunk's own content reaches, when it spans pages. */
  endPageNumber?: number;
  /** Heading hierarchy of the section the chunk's own content begins in. */
  headingPath: string[];
  /** UTF-16 offsets into `ExtractedDocument.extractedText`; text === slice(start, end). */
  startOffset: number;
  endOffset: number;
  /** Characters at the start of `text` repeated from the previous chunk. */
  overlapChars: number;
  /** Heuristic (chars / charsPerToken), not a model tokenizer count. */
  estimatedTokens: number;
}

export interface DocumentChunk extends DocumentOwner {
  /** Deterministic: `${documentId}:${chunkIndex}`. Stable when reprocessed. */
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  metadata: ChunkMetadata;
}

export interface ExtractedDocument extends DocumentOwner {
  documentId: string;
  sourceType: SourceType;
  /** Sanitized base name of the original file, when one was provided. */
  filename?: string;
  extractedText: string;
  pageCount?: number;
  chunks: DocumentChunk[];
  /** Non-fatal notes, e.g. PDF pages with no extractable text. */
  warnings: string[];
}

export type DocumentErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CONFIG"
  | "UNSUPPORTED_FORMAT"
  | "FORMAT_MISMATCH"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "TEXT_TOO_LARGE"
  | "EMPTY_CONTENT"
  | "SCANNED_PDF"
  | "ENCRYPTED_FILE"
  | "CORRUPT_FILE"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

export interface DocumentError {
  code: DocumentErrorCode;
  /** Never contains document text. */
  message: string;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DocumentError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (code: DocumentErrorCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
