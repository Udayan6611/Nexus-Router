import { DocumentProcessingError } from "./errors";

export interface DocumentLimits {
  /** Enforced before any parsing. */
  maxFileBytes: number;
  maxPages: number;
  /** Applies to extracted text and to pasted text. */
  maxExtractedChars: number;
  /** DOCX (zip) resource limits, checked from the zip directory before parsing. */
  maxDocxEntries: number;
  maxDocxUncompressedBytes: number;
}

export interface ChunkingConfig {
  /** Initial engineering defaults to tune with the embedding workstream. */
  targetTokens: number;
  overlapTokens: number;
  maxTokens: number;
  minTokens: number;
  /** Tokens are estimated as chars / charsPerToken (no model tokenizer). */
  charsPerToken: number;
}

export interface DocumentProcessingConfig {
  limits: DocumentLimits;
  chunking: ChunkingConfig;
}

export type DocumentProcessingConfigOverrides = {
  limits?: Partial<DocumentLimits>;
  chunking?: Partial<ChunkingConfig>;
};

export const DEFAULT_CONFIG: DocumentProcessingConfig = {
  limits: {
    maxFileBytes: 10 * 1024 * 1024,
    maxPages: 200,
    maxExtractedChars: 1_000_000,
    maxDocxEntries: 2_000,
    maxDocxUncompressedBytes: 50 * 1024 * 1024,
  },
  chunking: {
    targetTokens: 800,
    overlapTokens: 120,
    maxTokens: 1000,
    minTokens: 100,
    charsPerToken: 4,
  },
};

function defined<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function resolveConfig(
  overrides?: DocumentProcessingConfigOverrides,
): DocumentProcessingConfig {
  const cfg: DocumentProcessingConfig = {
    limits: { ...DEFAULT_CONFIG.limits, ...defined(overrides?.limits) },
    chunking: { ...DEFAULT_CONFIG.chunking, ...defined(overrides?.chunking) },
  };
  assertValid(cfg);
  return cfg;
}

function assertValid(cfg: DocumentProcessingConfig): void {
  const bad = (m: string): never => {
    throw new DocumentProcessingError("INVALID_CONFIG", m);
  };
  for (const [k, v] of Object.entries(cfg.limits)) {
    if (!Number.isFinite(v) || v <= 0) bad(`limits.${k} must be a positive number`);
  }
  const c = cfg.chunking;
  for (const [k, v] of Object.entries(c)) {
    if (!Number.isFinite(v) || v <= 0) bad(`chunking.${k} must be a positive number`);
  }
  if (c.minTokens > c.targetTokens) bad("chunking.minTokens must be <= targetTokens");
  if (c.targetTokens > c.maxTokens) bad("chunking.targetTokens must be <= maxTokens");
  if (c.overlapTokens >= c.targetTokens) bad("chunking.overlapTokens must be < targetTokens");
}
