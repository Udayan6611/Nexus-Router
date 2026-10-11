import { ok, err, type Result } from "@/lib/ai/contracts";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/server/supabase";
import type {
    EmbeddedChunk,
    KnowledgeRepository,
    RetrievedChunk,
    SimilaritySearchInput,
} from "./contracts";

/** Computes cosine similarity between two numeric vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        const valA = a[i]!;
        const valB = b[i]!;
        dot += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dot / denominator;
}

/**
 * In-memory reference repository implementing the KnowledgeRepository contract.
 * Used for testing and local development, strictly enforcing ownership scoping.
 */
export class InMemoryKnowledgeRepository implements KnowledgeRepository {
    readonly storageBackend = "in_memory" as const;
    private chunks: Map<string, EmbeddedChunk> = new Map();

    private makeKey(documentId: string, chunkIndex: number): string {
        return `${documentId}:${chunkIndex}`;
    }

    async saveChunks(chunks: EmbeddedChunk[]): Promise<Result<void>> {
        try {
            for (const chunk of chunks) {
                const key = this.makeKey(chunk.documentId, chunk.chunkIndex);
                this.chunks.set(key, { ...chunk });
            }
            return ok(undefined);
        } catch (e) {
            return err({
                code: "RETRIEVAL_FAILED",
                message: (e as Error).message || "Failed to persist chunks in memory",
            });
        }
    }

    async searchSimilar(input: SimilaritySearchInput): Promise<Result<RetrievedChunk[]>> {
        try {
            const { userId, sessionId, queryEmbedding, documentId, limit = 5, threshold = -1.0 } = input;

            const scored: RetrievedChunk[] = [];

            for (const chunk of this.chunks.values()) {
                // Enforce user isolation
                if (chunk.userId !== userId) continue;

                // Enforce optional session isolation
                if (sessionId !== undefined && chunk.sessionId !== sessionId) continue;

                // Enforce optional document filter
                if (documentId !== undefined && chunk.documentId !== documentId) continue;

                const score = cosineSimilarity(queryEmbedding, chunk.embedding);
                if (score >= threshold) {
                    scored.push({
                        chunkId: chunk.chunkId,
                        documentId: chunk.documentId,
                        userId: chunk.userId,
                        sessionId: chunk.sessionId,
                        chunkIndex: chunk.chunkIndex,
                        text: chunk.text,
                        score,
                        metadata: { ...chunk.metadata },
                    });
                }
            }

            // Sort descending by score
            scored.sort((a, b) => b.score - a.score);

            const bounded = scored.slice(0, Math.max(1, limit));
            return ok(bounded);
        } catch (e) {
            return err({
                code: "RETRIEVAL_FAILED",
                message: (e as Error).message || "In-memory search failed",
            });
        }
    }

    async deleteDocument(input: { userId: string; documentId: string }): Promise<Result<void>> {
        try {
            const { userId, documentId } = input;
            for (const [key, chunk] of this.chunks.entries()) {
                if (chunk.userId === userId && chunk.documentId === documentId) {
                    this.chunks.delete(key);
                }
            }
            return ok(undefined);
        } catch (e) {
            return err({
                code: "RETRIEVAL_FAILED",
                message: (e as Error).message || "Failed to delete document from memory",
            });
        }
    }
}

/**
 * Persistent Supabase PostgreSQL/pgvector repository implementing KnowledgeRepository.
 * Uses match_document_chunks RPC and service-role server client.
 */
export class SupabaseKnowledgeRepository implements KnowledgeRepository {
    readonly storageBackend = "supabase_pgvector" as const;
    private inMemoryFallback = new InMemoryKnowledgeRepository();

    async saveChunks(chunks: EmbeddedChunk[]): Promise<Result<void>> {
        if (!isSupabaseConfigured() || chunks.length === 0) {
            return this.inMemoryFallback.saveChunks(chunks);
        }

        try {
            const client = getSupabaseClient();
            const first = chunks[0]!;

            // 1. Ensure document record exists
            const { error: docError } = await client.from("documents").upsert({
                id: first.documentId,
                user_id: first.userId,
                session_id: first.sessionId || null,
                filename: first.metadata.filename || "untitled",
                mime_type: first.metadata.sourceType || "text/plain",
                source_type: first.metadata.sourceType || "text",
                size_bytes: chunks.reduce((acc, c) => acc + c.text.length, 0),
                chunk_count: chunks.length,
                updated_at: new Date().toISOString(),
            }, { onConflict: "id" });

            if (docError) {
                // If migration is unapplied or table does not exist, fall back to in-memory safely
                return this.inMemoryFallback.saveChunks(chunks);
            }

            // 2. Insert or upsert chunks with embeddings
            const records = chunks.map((c) => ({
                id: c.chunkId,
                document_id: c.documentId,
                chunk_index: c.chunkIndex,
                text: c.text,
                embedding: c.embedding,
                embedding_model: c.embeddingModel,
                metadata: c.metadata,
                user_id: c.userId,
                session_id: c.sessionId || null,
            }));

            const { error: chunkError } = await client.from("document_chunks").upsert(
                records,
                { onConflict: "id" },
            );

            if (chunkError) {
                return this.inMemoryFallback.saveChunks(chunks);
            }

            // Also mirror in inMemoryFallback for immediate cache
            await this.inMemoryFallback.saveChunks(chunks);
            return ok(undefined);
        } catch {
            return this.inMemoryFallback.saveChunks(chunks);
        }
    }

    async searchSimilar(input: SimilaritySearchInput): Promise<Result<RetrievedChunk[]>> {
        if (!isSupabaseConfigured()) {
            return this.inMemoryFallback.searchSimilar(input);
        }

        try {
            const client = getSupabaseClient();
            const { data, error } = await client.rpc("match_document_chunks", {
                query_embedding: input.queryEmbedding,
                match_threshold: input.threshold ?? -1.0,
                match_count: input.limit ?? 5,
                filter_user_id: input.userId,
                filter_session_id: input.sessionId || null,
                filter_document_id: input.documentId || null,
            });

            if (error || !Array.isArray(data)) {
                // If RPC not applied yet, fall back to in-memory search
                return this.inMemoryFallback.searchSimilar(input);
            }

            const results: RetrievedChunk[] = data.map((row: Record<string, unknown>) => ({
                chunkId: String(row.id),
                documentId: String(row.document_id),
                userId: String(row.user_id),
                sessionId: String(row.session_id || ""),
                chunkIndex: Number(row.chunk_index),
                text: String(row.text),
                score: Number(row.similarity ?? 0),
                metadata: (row.metadata as Record<string, unknown>) ?? {},
            }));

            return ok(results);
        } catch {
            return this.inMemoryFallback.searchSimilar(input);
        }
    }

    async deleteDocument(input: { userId: string; documentId: string }): Promise<Result<void>> {
        if (!isSupabaseConfigured()) {
            return this.inMemoryFallback.deleteDocument(input);
        }

        try {
            const client = getSupabaseClient();
            const { error } = await client
                .from("documents")
                .delete()
                .eq("id", input.documentId)
                .eq("user_id", input.userId);

            if (error) {
                return this.inMemoryFallback.deleteDocument(input);
            }

            await this.inMemoryFallback.deleteDocument(input);
            return ok(undefined);
        } catch {
            return this.inMemoryFallback.deleteDocument(input);
        }
    }
}

/** Global singleton knowledge repository resolver */
let repositoryInstance: KnowledgeRepository | undefined;

export function getKnowledgeRepository(): KnowledgeRepository {
    if (!repositoryInstance) {
        repositoryInstance = isSupabaseConfigured()
            ? new SupabaseKnowledgeRepository()
            : new InMemoryKnowledgeRepository();
    }
    return repositoryInstance;
}

export function resetKnowledgeRepository(): void {
    repositoryInstance = undefined;
}
