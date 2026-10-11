import { ok, err, type Result } from "@/lib/ai/contracts";
import {
    embedBatchTexts,
    GEMINI_EMBEDDING_MODEL,
    type EmbeddingProvider,
} from "./embeddings";
import type {
    EmbeddedChunk,
    ExtractedDocument,
    IngestionResult,
    KnowledgeRepository,
} from "./contracts";
import { getKnowledgeRepository } from "./repository";

export interface IngestDocumentDeps {
    repository?: KnowledgeRepository;
    embeddingProvider?: EmbeddingProvider;
    batchSize?: number;
}

/**
 * Validates an extracted document, generates chunk embeddings in bounded batches,
 * associates metadata accurately, and persists chunks through the KnowledgeRepository.
 */
export async function ingestDocument(
    document: ExtractedDocument | unknown,
    deps: IngestDocumentDeps = {},
): Promise<Result<IngestionResult>> {
    if (!document || typeof document !== "object") {
        return err({ code: "INVALID_INPUT", message: "Invalid document input: expected an ExtractedDocument object." });
    }

    const doc = document as Partial<ExtractedDocument>;

    if (!doc.documentId || typeof doc.documentId !== "string" || doc.documentId.trim() === "") {
        return err({ code: "INVALID_INPUT", message: "documentId is missing or empty." });
    }

    if (!doc.userId || typeof doc.userId !== "string" || doc.userId.trim() === "") {
        return err({ code: "INVALID_INPUT", message: "userId is missing or empty." });
    }

    const sessionId = typeof doc.sessionId === "string" ? doc.sessionId : "";

    if (!Array.isArray(doc.chunks) || doc.chunks.length === 0) {
        return err({ code: "EMPTY_DOCUMENT", message: "Document contains no extractable chunks." });
    }

    // Validate all chunks have non-empty text
    for (let i = 0; i < doc.chunks.length; i++) {
        const chunk = doc.chunks[i];
        if (!chunk || typeof chunk.text !== "string" || chunk.text.trim() === "") {
            return err({ code: "INVALID_INPUT", message: `Chunk at index ${i} has empty or missing text.` });
        }
    }

    const repo = deps.repository ?? getKnowledgeRepository();

    // Extract texts to embed in batch
    const chunkTexts = doc.chunks.map((c) => c.text);

    // Generate embeddings for chunks
    const embeddingsResult = await embedBatchTexts(
        chunkTexts,
        deps.embeddingProvider,
        deps.batchSize ?? 16,
    );

    if (!embeddingsResult.ok) {
        return embeddingsResult;
    }

    const vectors = embeddingsResult.data;
    if (vectors.length !== doc.chunks.length) {
        return err({ code: "PROVIDER_ERROR", message: "Embedding count does not match chunk count." });
    }

    // Construct embedded chunks, preserving 1-to-1 relationship with source metadata
    const embeddedChunks: EmbeddedChunk[] = doc.chunks.map((chunk, i) => {
        const vector = vectors[i]!;
        const meta = chunk.metadata || {};

        return {
            chunkId: chunk.chunkId || `${doc.documentId}:${chunk.chunkIndex ?? i}`,
            documentId: doc.documentId!,
            userId: doc.userId!,
            sessionId,
            chunkIndex: chunk.chunkIndex ?? i,
            text: chunk.text,
            embedding: vector,
            embeddingModel: GEMINI_EMBEDDING_MODEL,
            metadata: {
                sourceType: meta.sourceType || doc.sourceType,
                filename: doc.filename,
                pageNumber: meta.pageNumber,
                endPageNumber: meta.endPageNumber,
                headingPath: meta.headingPath ? [...meta.headingPath] : [],
                startOffset: meta.startOffset,
                endOffset: meta.endOffset,
                estimatedTokens: meta.estimatedTokens,
            },
        };
    });

    // Persist exclusively through the KnowledgeRepository interface
    const saveResult = await repo.saveChunks(embeddedChunks);
    if (!saveResult.ok) {
        return saveResult;
    }

    return ok({
        documentId: doc.documentId,
        chunkCount: embeddedChunks.length,
        status: "success",
        storageBackend: repo.storageBackend,
    });
}
