import type { DocumentErrorCode } from "./contracts";

/** Internal typed failure. Messages must never contain document content. */
export class DocumentProcessingError extends Error {
  readonly code: DocumentErrorCode;
  constructor(code: DocumentErrorCode, message: string) {
    super(message);
    this.name = "DocumentProcessingError";
    this.code = code;
  }
}
