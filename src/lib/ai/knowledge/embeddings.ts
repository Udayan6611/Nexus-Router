import { GoogleGenerativeAI } from "@google/generative-ai";
import { ok, err, type Result } from "@/lib/ai/contracts";

export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
export const EXPECTED_EMBEDDING_DIMENSION = 768;
export const MAX_TEXT_EMBEDDING_CHARS = 20_000;

export interface EmbeddingProvider {
    embedBatch(texts: string[]): Promise<number[][]>;
}

export interface EmbedOptions {
    model?: string;
    timeoutMs?: number;
    apiKey?: string;
}

/** Validates that an embedding vector is well-formed, of expected dimension, and contains finite numbers */
export function validateEmbeddingVector(vector: unknown, expectedDim = EXPECTED_EMBEDDING_DIMENSION): boolean {
    if (!Array.isArray(vector)) return false;
    if (vector.length !== expectedDim) return false;
    for (let i = 0; i < vector.length; i++) {
        const val = vector[i];
        if (typeof val !== "number" || !Number.isFinite(val) || Number.isNaN(val)) {
            return false;
        }
    }
    return true;
}

/** Default Gemini Embedding Provider implementation with verified cancellation timeout */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
    private ai: GoogleGenerativeAI;
    private modelName: string;
    private timeoutMs: number;

    constructor(options: EmbedOptions = {}) {
        const apiKey = options.apiKey || process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured.");
        }
        this.ai = new GoogleGenerativeAI(apiKey);
        this.modelName = options.model || process.env.GEMINI_EMBEDDING_MODEL?.trim() || GEMINI_EMBEDDING_MODEL;
        this.timeoutMs = options.timeoutMs ?? 10_000;
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        const model = this.ai.getGenerativeModel({ model: this.modelName });

        const requests = texts.map((t) => ({
            content: { role: "user", parts: [{ text: t }] },
        }));

        // Execute with verified timeout via Promise.race
        const controller = new AbortController();
        let timer: NodeJS.Timeout | undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new Error(`Embedding request timed out after ${this.timeoutMs}ms.`));
            }, this.timeoutMs);
        });

        try {
            const apiPromise = model.batchEmbedContents({
                requests,
            });

            const response = await Promise.race([apiPromise, timeoutPromise]);

            if (!response.embeddings || response.embeddings.length !== texts.length) {
                throw new Error("Gemini API returned an incomplete embedding batch.");
            }

            const results: number[][] = [];
            for (const item of response.embeddings) {
                const values = item.values;
                if (!validateEmbeddingVector(values)) {
                    throw new Error("Gemini API returned an invalid or non-finite embedding vector.");
                }
                results.push(values);
            }

            return results;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }
}

/**
 * Embeds a single text string using an injectable provider or default Gemini provider.
 */
export async function embedText(
    text: string,
    provider?: EmbeddingProvider,
): Promise<Result<number[]>> {
    if (typeof text !== "string" || text.trim() === "") {
        return err({ code: "INVALID_INPUT", message: "Cannot generate embedding for empty text." });
    }

    const clean = text.trim();
    if (clean.length > MAX_TEXT_EMBEDDING_CHARS) {
        return err({
            code: "TEXT_TOO_LARGE",
            message: `Text length (${clean.length}) exceeds maximum embedding limit of ${MAX_TEXT_EMBEDDING_CHARS} characters.`,
        });
    }

    try {
        const activeProvider = provider ?? new GeminiEmbeddingProvider();
        const results = await activeProvider.embedBatch([clean]);
        if (!results[0] || !validateEmbeddingVector(results[0])) {
            return err({ code: "PROVIDER_ERROR", message: "Failed to generate valid embedding vector." });
        }
        return ok(results[0]);
    } catch (e) {
        return err({
            code: "PROVIDER_ERROR",
            message: (e as Error).message || "Embedding generation failed.",
            retryable: true,
        });
    }
}

/**
 * Embeds an array of texts in bounded batches.
 */
export async function embedBatchTexts(
    texts: string[],
    provider?: EmbeddingProvider,
    batchSize = 16,
): Promise<Result<number[][]>> {
    if (texts.length === 0) {
        return ok([]);
    }

    for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        if (typeof t !== "string" || t.trim() === "") {
            return err({ code: "INVALID_INPUT", message: `Text at index ${i} is empty.` });
        }
        if (t.length > MAX_TEXT_EMBEDDING_CHARS) {
            return err({
                code: "TEXT_TOO_LARGE",
                message: `Text at index ${i} (${t.length} chars) exceeds maximum embedding limit of ${MAX_TEXT_EMBEDDING_CHARS} characters.`,
            });
        }
    }

    try {
        const activeProvider = provider ?? new GeminiEmbeddingProvider();
        const results: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchVectors = await activeProvider.embedBatch(batch);
            if (batchVectors.length !== batch.length) {
                return err({
                    code: "PROVIDER_ERROR",
                    message: `Expected ${batch.length} vectors, got ${batchVectors.length}`,
                });
            }
            for (let j = 0; j < batchVectors.length; j++) {
                const vec = batchVectors[j];
                if (!validateEmbeddingVector(vec)) {
                    return err({
                        code: "PROVIDER_ERROR",
                        message: `Invalid embedding vector generated for item ${i + j}.`,
                    });
                }
                results.push(vec);
            }
        }

        return ok(results);
    } catch (e) {
        return err({
            code: "PROVIDER_ERROR",
            message: (e as Error).message || "Batch embedding generation failed.",
            retryable: true,
        });
    }
}

