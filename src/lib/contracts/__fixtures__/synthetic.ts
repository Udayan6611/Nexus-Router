/**
 * SYNTHETIC TEST DATA ONLY. Not catalogue data: the models, providers, prices and
 * numbers here are invented to exercise schemas and must never be used as real metadata.
 */
import type { ZodType } from "zod";

export const SYNTHETIC_TS = "2026-10-11T10:00:00Z";
export const SYNTHETIC_RUN_ID = "run_123e4567-e89b-42d3-a456-426614174000";
export const SYNTHETIC_REQUEST_ID = "req_123e4567-e89b-42d3-a456-426614174000";

export const accepts = (schema: ZodType, value: unknown): boolean =>
    schema.safeParse(value).success;

export const clone = <T>(value: T): T => structuredClone(value);

const provenance = {
    basis: "estimated",
    source: "synthetic test fixture",
    observedAt: SYNTHETIC_TS,
};

export const syntheticModel = {
    id: "test-model-a",
    provider: "test-provider",
    providerModelId: "test-provider/model-a",
    displayName: "Synthetic Model A",
    contextWindow: {
        status: "known",
        value: { contextWindowTokens: 8000, maxOutputTokens: 1000 },
        provenance,
    },
    pricing: {
        status: "known",
        value: { inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 },
        provenance,
    },
    latency: { status: "unknown", reason: "not_yet_checked" },
    quality: { status: "stale", value: { tier: "standard" }, provenance },
    availability: { status: "known", value: "available", provenance },
    capabilities: [
        { capability: "chat", supported: { status: "known", value: true, provenance } },
        { capability: "vision", supported: { status: "unknown" } },
    ],
    updatedAt: SYNTHETIC_TS,
};


export const syntheticRanked = (
    rank: number,
    modelId: string,
): {
    rank: number;
    modelId: string;
    provider: string;
    estimatedCostUsd?: number;
    estimatedLatencyMs?: number;
    qualityTier?: "basic" | "standard" | "advanced" | "frontier";
    explanation: string;
} => ({
    rank,
    modelId,
    provider: "test-provider",
    estimatedCostUsd: 0.01,
    estimatedLatencyMs: 500,
    qualityTier: "standard",
    explanation: "Synthetic ranking explanation",
});


export const syntheticRejectedCandidate = {
    status: "rejected",
    modelId: "test-model-c",
    provider: "test-provider",
    reasons: [
        {
            code: "exceeds_max_cost",
            message: "Synthetic: estimated cost is above the limit",
            estimatedCostUsd: 5,
            maxCostUsd: 1,
        },
    ],
};

export const syntheticSelectedDecision = {
    outcome: "selected",
    preference: "cost",
    decidedAt: SYNTHETIC_TS,
    consideredCount: 3,
    selected: syntheticRanked(1, "test-model-a"),
    fallbacks: [syntheticRanked(2, "test-model-b")],
    rejected: [syntheticRejectedCandidate],
};

export const syntheticNoEligibleDecision = {
    outcome: "no_eligible_model",
    preference: "latency",
    decidedAt: SYNTHETIC_TS,
    consideredCount: 1,
    rejected: [syntheticRejectedCandidate],
    summary: "Synthetic: no model satisfies the constraints",
};

export const syntheticProviderError = {
    code: "rate_limited",
    retryable: true,
    httpStatus: 429,
    retryAfterMs: 1000,
    message: "Synthetic rate limit",
};

export const syntheticInferenceResponse = {
    runId: SYNTHETIC_RUN_ID,
    modelId: "test-model-a",
    provider: "test-provider",
    mode: "simulated",
    output: "synthetic output",
    finishReason: "stop",
    latencyMs: 1000,
    completedAt: "2026-10-11T10:00:01Z",
};

const attemptBase = {
    modelId: "test-model-a",
    provider: "test-provider",
    mode: "simulated",
};

export const syntheticAttemptSucceeded = {
    ...attemptBase,
    attemptNumber: 1,
    role: "primary",
    status: "succeeded",
    startedAt: SYNTHETIC_TS,
    endedAt: "2026-10-11T10:00:01Z",
    latencyMs: 1000,
    usage: { inputTokens: 10, outputTokens: 20, source: "estimated" },
    charge: { kind: "estimated", amountUsd: 0.001 },
};

export const syntheticAttemptFailed = {
    ...attemptBase,
    attemptNumber: 1,
    role: "primary",
    status: "failed",
    startedAt: SYNTHETIC_TS,
    endedAt: "2026-10-11T10:00:01Z",
    error: syntheticProviderError,
};

export const syntheticAttemptInProgress = {
    ...attemptBase,
    attemptNumber: 1,
    role: "primary",
    status: "in_progress",
    startedAt: SYNTHETIC_TS,
};

export const syntheticAttemptSkipped = {
    ...attemptBase,
    attemptNumber: 2,
    role: "fallback",
    status: "skipped",
    skipReason: {
        code: "insufficient_deadline",
        message: "Synthetic: not enough time remains",
        remainingMs: 100,
        requiredMs: 500,
    },
};

export const syntheticRunExecuting = {
    runId: SYNTHETIC_RUN_ID,
    requestId: SYNTHETIC_REQUEST_ID,
    status: "executing",
    selectionMode: "automatic",
    mode: "simulated",
    createdAt: SYNTHETIC_TS,
    startedAt: SYNTHETIC_TS,
    decision: syntheticSelectedDecision,
    attempts: [syntheticAttemptInProgress],
    fallbackTrace: [],
};