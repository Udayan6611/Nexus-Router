import { z } from "zod";
import {
    MAX_LATENCY_MS,
    isoTimestampSchema,
    latencyMsSchema,
    executionModeSchema,
    modelRefShape,
    providerModelIdSchema,
    runIdSchema,
    tokenCountSchema,
    usdSchema,
} from "@/lib/contracts/primitives";

/** Hard cap on combined message size (characters). Detailed request-size limits come with Module 7. */
export const MAX_TOTAL_INPUT_CHARS = 500_000;

export const CHAT_ROLES = ["system", "user", "assistant"] as const;
export const chatMessageSchema = z.strictObject({
    role: z.enum(CHAT_ROLES),
    content: z.string().min(1).max(100_000),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Client-safe inference input. Strict: provider, credentials, run IDs, deadlines and any
 * other internal execution metadata are rejected, never trusted from the client.
 */
export const inferenceInputSchema = z
    .strictObject({
        messages: z.array(chatMessageSchema).min(1).max(100),
        maxOutputTokens: z.int().min(1).max(1_000_000).optional(),
        temperature: z.number().min(0).max(2).optional(),
    })
    .refine(
        (input) =>
            input.messages.reduce((total, message) => total + message.content.length, 0) <=
            MAX_TOTAL_INPUT_CHARS,
        { message: "Total message content is too large", path: ["messages"] },
    );
export type InferenceInput = z.infer<typeof inferenceInputSchema>;

/**
 * INTERNAL provider-neutral request built by the server (never parsed from client bodies).
 * Cancellation is a runtime concern: see InferenceCallOptions.
 */
export const inferenceRequestSchema = z.strictObject({
    runId: runIdSchema,
    attemptNumber: z.int().min(1).max(20),
    ...modelRefShape,
    providerModelId: providerModelIdSchema,
    mode: executionModeSchema,
    input: inferenceInputSchema,
    deadlineAt: isoTimestampSchema,
    timeoutMs: z.int().min(1).max(MAX_LATENCY_MS),
});
export type InferenceRequest = z.infer<typeof inferenceRequestSchema>;

/** Best-effort cancellation is passed at call time; an AbortSignal cannot be a schema. */
export interface InferenceCallOptions {
    readonly signal?: AbortSignal;
}

/** Absent usage means unavailable. It must never be zero-filled. */
export const tokenUsageSchema = z.strictObject({
    inputTokens: tokenCountSchema,
    outputTokens: tokenCountSchema,
    source: z.enum(["provider_reported", "estimated"]),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

/** Provider-reported charges and our own estimates are always distinct kinds. */
export const costRecordSchema = z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("provider_reported"), amountUsd: usdSchema }),
    z.strictObject({ kind: z.literal("estimated"), amountUsd: usdSchema }),
]);
export type CostRecord = z.infer<typeof costRecordSchema>;

export const PROVIDER_ERROR_CODES = [
    "timeout",
    "rate_limited",
    "server_error",
    "unavailable",
    "bad_request",
    "unauthorized",
    "not_found",
    "content_filtered",
    "network_error",
    "cancelled",
    "unknown",
] as const;
export const providerErrorCodeSchema = z.enum(PROVIDER_ERROR_CODES);

/** Normalized provider failure. `message` must already be sanitized (no secrets, no raw payloads). */
export const providerErrorSchema = z.strictObject({
    code: providerErrorCodeSchema,
    retryable: z.boolean(),
    httpStatus: z.int().min(100).max(599).optional(),
    retryAfterMs: z.int().min(0).max(MAX_LATENCY_MS).optional(),
    message: z.string().min(1).max(300),
});
export type ProviderError = z.infer<typeof providerErrorSchema>;

export const inferenceResponseSchema = z.strictObject({
    runId: runIdSchema,
    ...modelRefShape,
    mode: executionModeSchema,
    output: z.string().max(1_000_000),
    finishReason: z.enum(["stop", "length", "content_filter", "other"]),
    /** Elapsed time measured by us, not provider-claimed. */
    latencyMs: latencyMsSchema,
    usage: tokenUsageSchema.optional(),
    charge: costRecordSchema.optional(),
    completedAt: isoTimestampSchema,
});
export type InferenceResponse = z.infer<typeof inferenceResponseSchema>;