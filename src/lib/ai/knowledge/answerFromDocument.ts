import { z } from "zod";
import { ok, err, type Result } from "@/lib/ai/contracts";
import type { CitationReference, GroundedAnswer, RetrievedChunk } from "./contracts";
import { GROUNDED_ANSWER_SYSTEM_PROMPT, buildGroundedUserMessage } from "./prompts";

export interface AnswerProvider {
    readonly modelName?: string;
    generate(req: { system: string; user: string }): Promise<string>;
}

export interface AnswerFromDocumentDeps {
    provider?: AnswerProvider;
}

const LlmAnswerOutputSchema = z.object({
    answer: z.string().min(1),
    insufficientEvidence: z.boolean(),
    citedChunkIds: z.array(z.string()),
});

/** Default provider using Groq with json_object mode */
export class DefaultGroqAnswerProvider implements AnswerProvider {
    public readonly modelName: string;
    private apiKey?: string;

    constructor(options?: { apiKey?: string; model?: string }) {
        this.apiKey = options?.apiKey || process.env.GROQ_API_KEY?.trim();
        this.modelName = options?.model || process.env.GROQ_ANSWER_MODEL?.trim() || "llama-3.3-70b-versatile";
    }

    async generate(req: { system: string; user: string }): Promise<string> {
        if (!this.apiKey) {
            throw new Error("GROQ_API_KEY is not configured for answer generation.");
        }

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.modelName,
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: req.system },
                    { role: "user", content: req.user },
                ],
            }),
        });

        if (!res.ok) {
            throw new Error(`Answer generation API returned HTTP ${res.status}`);
        }

        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("Answer provider returned empty content.");
        }

        return content;
    }
}

/**
 * Generates an answer strictly grounded in the supplied chunks.
 * Does not invent facts or citations. If evidence is insufficient, explicitly indicates so.
 */
export async function answerFromDocument(
    query: string,
    chunks: RetrievedChunk[],
    deps: AnswerFromDocumentDeps = {},
): Promise<Result<GroundedAnswer>> {
    if (typeof query !== "string" || query.trim() === "") {
        return err({ code: "INVALID_INPUT", message: "Query cannot be empty." });
    }

    // Handle empty evidence set immediately without unnecessary provider call
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return ok({
            answer: "The provided documents do not contain sufficient evidence to answer this question.",
            insufficientEvidence: true,
            sources: [],
            modelUsed: "none",
        });
    }

    const userMessage = buildGroundedUserMessage(query, chunks);
    const provider = deps.provider ?? new DefaultGroqAnswerProvider();

    try {
        const rawOutput = await provider.generate({
            system: GROUNDED_ANSWER_SYSTEM_PROMPT,
            user: userMessage,
        });

        // Clean any markdown fences if present
        const cleanedJson = rawOutput.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        const parsedJson = JSON.parse(cleanedJson);

        const validated = LlmAnswerOutputSchema.safeParse(parsedJson);
        if (!validated.success) {
            return err({
                code: "PROVIDER_ERROR",
                message: "Answer provider output did not match expected grounded answer schema.",
            });
        }

        const { answer, insufficientEvidence, citedChunkIds } = validated.data;

        // Build verified citations (only allowing chunk IDs that were actually in the retrieved chunks)
        const chunkMap = new Map<string, RetrievedChunk>();
        for (const chunk of chunks) {
            chunkMap.set(chunk.chunkId, chunk);
        }

        const verifiedSources: CitationReference[] = [];
        const seenChunkIds = new Set<string>();

        for (const citedId of citedChunkIds) {
            const chunk = chunkMap.get(citedId);
            if (chunk && !seenChunkIds.has(citedId)) {
                seenChunkIds.add(citedId);
                verifiedSources.push({
                    documentId: chunk.documentId,
                    chunkId: chunk.chunkId,
                    filename: chunk.metadata.filename,
                    pageNumber: chunk.metadata.pageNumber,
                    endPageNumber: chunk.metadata.endPageNumber,
                    headingPath: chunk.metadata.headingPath,
                    score: chunk.score,
                });
            }
        }

        // If answer is supported but no citations were explicitly listed in array, default to top matching chunk
        if (!insufficientEvidence && verifiedSources.length === 0 && chunks.length > 0) {
            const topChunk = chunks[0]!;
            verifiedSources.push({
                documentId: topChunk.documentId,
                chunkId: topChunk.chunkId,
                filename: topChunk.metadata.filename,
                pageNumber: topChunk.metadata.pageNumber,
                endPageNumber: topChunk.metadata.endPageNumber,
                headingPath: topChunk.metadata.headingPath,
                score: topChunk.score,
            });
        }

        return ok({
            answer,
            insufficientEvidence,
            sources: insufficientEvidence ? [] : verifiedSources,
            modelUsed: provider.modelName || "llama-3.3-70b-versatile",
        });
    } catch (e) {
        return err({
            code: "PROVIDER_ERROR",
            message: (e as Error).message || "Grounded answer generation failed.",
            retryable: true,
        });
    }
}
