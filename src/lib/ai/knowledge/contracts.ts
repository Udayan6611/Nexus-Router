import type { Result } from "@/lib/ai/contracts";
import type { ExtractedDocument, DocumentChunk as ExtractedChunk } from "@/lib/ai/document-processing/contracts";

export type { ExtractedDocument, ExtractedChunk };

export interface ChunkLocationMetadata {
    sourceType?: string;
    filename?: string;
    pageNumber?: number;
    endPageNumber?: number;
    headingPath?: string[];
    sectionTitle?: string;
    startOffset?: number;
    endOffset?: number;
    estimatedTokens?: number;
}

export interface EmbeddedChunk {
    chunkId: string;
    documentId: string;
    userId: string;
    sessionId: string;
    chunkIndex: number;
    text: string;
    embedding: number[];
    embeddingModel: string;
    metadata: ChunkLocationMetadata;
}

export interface RetrievedChunk {
    chunkId: string;
    documentId: string;
    userId: string;
    sessionId: string;
    chunkIndex: number;
    text: string;
    score: number;
    metadata: ChunkLocationMetadata;
}

export interface SimilaritySearchInput {
    userId: string;
    sessionId?: string;
    queryEmbedding: number[];
    documentId?: string;
    limit?: number;
    threshold?: number;
}

export interface KnowledgeRepository {
    /** Saves chunks idempotently on (documentId, chunkIndex) */
    saveChunks(chunks: EmbeddedChunk[]): Promise<Result<void>>;

    /** Searches similar chunks matching query vector and authorization filters */
    searchSimilar(input: SimilaritySearchInput): Promise<Result<RetrievedChunk[]>>;

    /** Deletes document chunks for a specific user and document */
    deleteDocument(input: { userId: string; documentId: string }): Promise<Result<void>>;

    /** Indicates the active storage backend */
    readonly storageBackend: "supabase_pgvector" | "in_memory";
}

export interface IngestionResult {
    documentId: string;
    chunkCount: number;
    status: "success" | "partial";
    storageBackend: "supabase_pgvector" | "in_memory";
}

export interface CitationReference {
    documentId: string;
    chunkId: string;
    filename?: string;
    pageNumber?: number;
    endPageNumber?: number;
    headingPath?: string[];
    score?: number;
}

export interface GroundedAnswer {
    answer: string;
    insufficientEvidence: boolean;
    sources: CitationReference[];
    modelUsed: string;
}
