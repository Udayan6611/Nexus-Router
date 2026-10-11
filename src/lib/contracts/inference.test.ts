import { describe, expect, it } from "vitest";
import {
    MAX_TOTAL_INPUT_CHARS,
    costRecordSchema,
    inferenceInputSchema,
    inferenceRequestSchema,
    inferenceResponseSchema,
    providerErrorSchema,
    tokenUsageSchema,
} from "@/lib/contracts";
import {
    SYNTHETIC_RUN_ID,
    SYNTHETIC_TS,
    accepts,
    syntheticInferenceResponse,
    syntheticProviderError,
} from "@/lib/contracts/__fixtures__/synthetic";

const input = { messages: [{ role: "user", content: "hello" }] };

describe("inferenceInputSchema (client-safe)", () => {
    it("accepts a minimal and a full input", () => {
        expect(accepts(inferenceInputSchema, input)).toBe(true);
        expect(accepts(inferenceInputSchema, { ...input, maxOutputTokens: 256, temperature: 0.7 })).toBe(true);
    });

    it.each([
        ["apiKey", "sk-secret"],
        ["provider", "test-provider"],
        ["providerModelId", "x"],
        ["runId", SYNTHETIC_RUN_ID],
        ["deadlineAt", SYNTHETIC_TS],
        ["timeoutMs", 1000],
    ])("rejects the internal or untrusted field %s", (key, value) => {
        expect(accepts(inferenceInputSchema, { ...input, [key]: value })).toBe(false);
    });

    it("enforces message bounds", () => {
        expect(accepts(inferenceInputSchema, { messages: [] })).toBe(false);
        expect(accepts(inferenceInputSchema, { messages: [{ role: "user", content: "" }] })).toBe(false);
        expect(accepts(inferenceInputSchema, { messages: [{ role: "robot", content: "x" }] })).toBe(false);
        expect(
            accepts(inferenceInputSchema, { messages: [{ role: "user", content: "x".repeat(100_001) }] }),
        ).toBe(false);
        expect(
            accepts(inferenceInputSchema, {
                messages: Array.from({ length: 101 }, () => ({ role: "user", content: "x" })),
            }),
        ).toBe(false);
    });

    it("enforces numeric bounds", () => {
        expect(accepts(inferenceInputSchema, { ...input, temperature: 2.1 })).toBe(false);
        expect(accepts(inferenceInputSchema, { ...input, temperature: -0.1 })).toBe(false);
        expect(accepts(inferenceInputSchema, { ...input, maxOutputTokens: 0 })).toBe(false);
    });

    it("enforces the total content limit", () => {
        const chunk = { role: "user", content: "x".repeat(100_000) };
        expect(MAX_TOTAL_INPUT_CHARS).toBe(500_000);
        expect(accepts(inferenceInputSchema, { messages: Array.from({ length: 5 }, () => chunk) })).toBe(true);
        expect(accepts(inferenceInputSchema, { messages: Array.from({ length: 6 }, () => chunk) })).toBe(false);
    });
});

describe("inferenceRequestSchema (internal)", () => {
    const request = {
        runId: SYNTHETIC_RUN_ID,
        attemptNumber: 1,
        modelId: "test-model-a",
        provider: "test-provider",
        providerModelId: "test-provider/model-a",
        mode: "simulated",
        input,
        deadlineAt: SYNTHETIC_TS,
        timeoutMs: 5000,
    };

    it("accepts a complete internal request", () => {
        expect(accepts(inferenceRequestSchema, request)).toBe(true);
    });

    it("requires a deadline, a mode and valid bounds", () => {
        const { deadlineAt: _deadline, ...withoutDeadline } = request;
        expect(accepts(inferenceRequestSchema, withoutDeadline)).toBe(false);
        expect(accepts(inferenceRequestSchema, { ...request, mode: "pretend" })).toBe(false);
        expect(accepts(inferenceRequestSchema, { ...request, timeoutMs: 0 })).toBe(false);
        expect(accepts(inferenceRequestSchema, { ...request, timeoutMs: 600_001 })).toBe(false);
        expect(accepts(inferenceRequestSchema, { ...request, runId: "run_bad" })).toBe(false);
    });
});

describe("usage and cost", () => {
    it("validates token usage", () => {
        expect(accepts(tokenUsageSchema, { inputTokens: 1, outputTokens: 2, source: "provider_reported" })).toBe(true);
        expect(accepts(tokenUsageSchema, { inputTokens: -1, outputTokens: 2, source: "estimated" })).toBe(false);
        expect(accepts(tokenUsageSchema, { inputTokens: 1.5, outputTokens: 2, source: "estimated" })).toBe(false);
        expect(accepts(tokenUsageSchema, { inputTokens: 1, outputTokens: 2, source: "guessed" })).toBe(false);
    });

    it("keeps provider-reported charges distinct from estimates", () => {
        expect(accepts(costRecordSchema, { kind: "provider_reported", amountUsd: 0.1 })).toBe(true);
        expect(accepts(costRecordSchema, { kind: "estimated", amountUsd: 0.1 })).toBe(true);
        expect(accepts(costRecordSchema, { kind: "invoice", amountUsd: 0.1 })).toBe(false);
        expect(accepts(costRecordSchema, { kind: "estimated", amountUsd: -1 })).toBe(false);
        expect(accepts(costRecordSchema, { amountUsd: 0.1 })).toBe(false);
    });
});

describe("providerErrorSchema", () => {
    it("accepts a normalized error", () => {
        expect(accepts(providerErrorSchema, syntheticProviderError)).toBe(true);
    });

    it("enforces code, status and message bounds", () => {
        expect(accepts(providerErrorSchema, { ...syntheticProviderError, code: "exploded" })).toBe(false);
        expect(accepts(providerErrorSchema, { ...syntheticProviderError, httpStatus: 99 })).toBe(false);
        expect(accepts(providerErrorSchema, { ...syntheticProviderError, httpStatus: 600 })).toBe(false);
        expect(accepts(providerErrorSchema, { ...syntheticProviderError, message: "x".repeat(301) })).toBe(false);
        expect(accepts(providerErrorSchema, { ...syntheticProviderError, rawBody: "{}" })).toBe(false);
    });
});

describe("inferenceResponseSchema", () => {
    it("accepts a response without usage (unavailable, not zero)", () => {
        const result = inferenceResponseSchema.safeParse(syntheticInferenceResponse);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.usage).toBeUndefined();
    });

    it("requires the execution mode label and valid latency", () => {
        const { mode: _mode, ...withoutMode } = syntheticInferenceResponse;
        expect(accepts(inferenceResponseSchema, withoutMode)).toBe(false);
        expect(accepts(inferenceResponseSchema, { ...syntheticInferenceResponse, latencyMs: -1 })).toBe(false);
        expect(accepts(inferenceResponseSchema, { ...syntheticInferenceResponse, finishReason: "vibes" })).toBe(false);
    });
});