import { ok, err, type Result } from "@/lib/ai/contracts";
import { embedText, type EmbeddingProvider } from "./embeddings";
import type { KnowledgeRepository, RetrievedChunk } from "./contracts";
import { getKnowledgeRepository } from "./repository";

export const MAX_QUERY_CHARS = 2000;

export interface RetrieveKnowledgeOptions {
    userId?: string;
    sessionId?: string;
    documentId?: string;
    limit?: number;
    threshold?: number;
}

export interface RetrieveKnowledgeDeps {
    repository?: KnowledgeRepository;
    embeddingProvider?: EmbeddingProvider;
}

/**
 * Embeds the user query, searches the repository within authorized scopes,
 * applies optional document filtering, and returns ranked evidence chunks.
 */
export async function retrieveKnowledge(
    query: string,
    options: RetrieveKnowledgeOptions = {},
    deps: RetrieveKnowledgeDeps = {},
): Promise<Result<RetrievedChunk[]>> {
    if (typeof query !== "string" || query.trim() === "") {
        return err({ code: "INVALID_INPUT", message: "Query cannot be empty." });
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length > MAX_QUERY_CHARS) {
        return err({
            code: "INVALID_INPUT",
            message: `Query length (${cleanQuery.length}) exceeds maximum limit of ${MAX_QUERY_CHARS} characters.`,
        });
    }

    const userId = options.userId || "anonymous";
    const repo = deps.repository ?? getKnowledgeRepository();

    // Generate query embedding
    const embeddingResult = await embedText(cleanQuery, deps.embeddingProvider);
    if (!embeddingResult.ok) {
        return err({
            code: "RETRIEVAL_FAILED",
            message: `Failed to generate query embedding: ${embeddingResult.error.message}`,
        });
    }

    const queryEmbedding = embeddingResult.data;

    // Search repository
    const searchResult = await repo.searchSimilar({
        userId,
        sessionId: options.sessionId,
        queryEmbedding,
        documentId: options.documentId,
        limit: options.limit ?? 5,
        threshold: options.threshold ?? -1.0,
    });

    if (!searchResult.ok) {
        return searchResult;
    }

    return ok(searchResult.data);
}
