import { describe, expect, it } from "vitest";
import {
    advisoryShortlistSchema,
    explicitConstraintsSchema,
    inferredRequirementsSchema,
    rejectedCandidateSchema,
    rejectionReasonSchema,
    routeRequestSchema,
    routingDecisionSchema,
    routingInputSchema,
} from "@/lib/contracts";
import {
    accepts,
    clone,
    syntheticNoEligibleDecision,
    syntheticRanked,
    syntheticRejectedCandidate,
    syntheticSelectedDecision,
} from "@/lib/contracts/__fixtures__/synthetic";

const inferred = {
    source: "ai_assisted",
    taskType: { value: "summarization", confidence: 0.8 },
    complexity: { value: "medium", confidence: 0.4 },
    likelyCapabilities: { value: ["chat"], confidence: 0.6 },
};
const advisory = { source: "ai_advisory", modelIds: ["test-model-a"] };

describe("routeRequestSchema (client-facing)", () => {
    it("accepts a minimal request", () => {
        expect(accepts(routeRequestSchema, { preference: "cost", constraints: {} })).toBe(true);
    });

    it("requires a valid preference and explicit constraints", () => {
        expect(accepts(routeRequestSchema, { constraints: {} })).toBe(false);
        expect(accepts(routeRequestSchema, { preference: "balanced", constraints: {} })).toBe(false);
        expect(accepts(routeRequestSchema, { preference: "cost" })).toBe(false);
    });

    it.each([
        ["inferred", inferred],
        ["advisory", advisory],
        ["apiKey", "sk-nope"],
        ["provider", "test-provider"],
        ["providerModelId", "x"],
    ])("rejects the internal or untrusted field %s", (key, value) => {
        expect(accepts(routeRequestSchema, { preference: "cost", constraints: {}, [key]: value })).toBe(false);
    });
});

describe("routingInputSchema (internal)", () => {
    it("accepts inferred requirements and an advisory shortlist", () => {
        expect(
            accepts(routingInputSchema, { preference: "quality", constraints: {}, inferred, advisory }),
        ).toBe(true);
    });
});

describe("explicit constraints", () => {
    it("accepts a full set of hard constraints", () => {
        expect(
            accepts(explicitConstraintsSchema, {
                maxCostUsd: 0.5,
                maxLatencyMs: 2000,
                requiredCapabilities: ["chat", "tool_use"],
                minContextWindowTokens: 8000,
                minQualityTier: "advanced",
                allowedProviders: ["test-provider"],
                blockedProviders: ["other-provider"],
            }),
        ).toBe(true);
    });

    it.each([
        ["zero cost", { maxCostUsd: 0 }],
        ["negative cost", { maxCostUsd: -1 }],
        ["huge cost", { maxCostUsd: 10_001 }],
        ["zero latency", { maxLatencyMs: 0 }],
        ["fractional latency", { maxLatencyMs: 1.5 }],
        ["latency over the cap", { maxLatencyMs: 600_001 }],
        ["duplicate capabilities", { requiredCapabilities: ["chat", "chat"] }],
        ["unknown capability", { requiredCapabilities: ["telepathy"] }],
        ["unknown quality tier", { minQualityTier: "godlike" }],
        ["zero context window", { minContextWindowTokens: 0 }],
        ["provider both allowed and blocked", { allowedProviders: ["a"], blockedProviders: ["a"] }],
        ["too many providers", { allowedProviders: Array.from({ length: 33 }, (_, i) => `p${i}`) }],
    ])("rejects %s", (_label, constraints) => {
        expect(accepts(explicitConstraintsSchema, constraints)).toBe(false);
    });

    it("does not accept inferred-only fields", () => {
        expect(accepts(explicitConstraintsSchema, { complexity: "high" })).toBe(false);
        expect(accepts(explicitConstraintsSchema, { likelyCapabilities: ["chat"] })).toBe(false);
    });
});

describe("inferred requirements stay distinct from hard constraints", () => {
    it("accepts values with confidence, including low confidence", () => {
        expect(accepts(inferredRequirementsSchema, inferred)).toBe(true);
        expect(
            accepts(inferredRequirementsSchema, { source: "heuristic", complexity: { value: "low", confidence: 0 } }),
        ).toBe(true);
    });

    it("cannot carry hard constraints", () => {
        expect(accepts(inferredRequirementsSchema, { ...inferred, maxCostUsd: 1 })).toBe(false);
        expect(accepts(inferredRequirementsSchema, { ...inferred, maxLatencyMs: 100 })).toBe(false);
    });

    it("bounds confidence and rejects missing confidence", () => {
        expect(
            accepts(inferredRequirementsSchema, { source: "heuristic", complexity: { value: "low", confidence: 1.1 } }),
        ).toBe(false);
        expect(accepts(inferredRequirementsSchema, { source: "heuristic", complexity: { value: "low" } })).toBe(false);
    });
});

describe("advisory shortlist", () => {
    it("allows an empty shortlist, which is not a routing outcome", () => {
        const empty = { source: "ai_advisory", modelIds: [] };
        expect(accepts(advisoryShortlistSchema, empty)).toBe(true);
        expect(accepts(routingDecisionSchema, empty)).toBe(false);
    });

    it("bounds the shortlist and rejects other sources", () => {
        const tooMany = { source: "ai_advisory", modelIds: Array.from({ length: 21 }, (_, i) => `m${i}`) };
        expect(accepts(advisoryShortlistSchema, tooMany)).toBe(false);
        expect(accepts(advisoryShortlistSchema, { source: "user", modelIds: [] })).toBe(false);
    });
});

const message = "Synthetic reason";
const validReasons = [
    { code: "exceeds_max_cost", message, estimatedCostUsd: 2, maxCostUsd: 1 },
    { code: "exceeds_max_latency", message, estimatedLatencyMs: 900, maxLatencyMs: 500 },
    { code: "missing_capability", message, capability: "vision", support: "unknown" },
    { code: "context_window_too_small", message, requiredTokens: 9000, availableTokens: 8000 },
    { code: "below_min_quality", message, requiredTier: "advanced", actualTier: "basic" },
    { code: "provider_not_allowed", message, provider: "test-provider" },
    { code: "provider_blocked", message, provider: "test-provider" },
    { code: "model_unavailable", message },
    { code: "simulated_unavailable", message },
    { code: "metadata_unknown", message, field: "pricing" },
    { code: "metadata_stale", message, field: "latency" },
    { code: "insufficient_deadline", message, remainingMs: 100, requiredMs: 500 },
];

describe("rejectionReasonSchema (discriminated on code)", () => {
    it.each(validReasons)("accepts $code", (reason) => {
        expect(accepts(rejectionReasonSchema, reason)).toBe(true);
    });

    it("rejects an unknown code", () => {
        expect(accepts(rejectionReasonSchema, { code: "too_ugly", message })).toBe(false);
    });

    it("rejects fields that belong to a different code", () => {
        expect(accepts(rejectionReasonSchema, { code: "model_unavailable", message, maxCostUsd: 1 })).toBe(false);
    });

    it("rejects a missing required field", () => {
        expect(accepts(rejectionReasonSchema, { code: "exceeds_max_cost", message, maxCostUsd: 1 })).toBe(false);
    });

    it("rejects an empty or oversized message", () => {
        expect(accepts(rejectionReasonSchema, { code: "model_unavailable", message: "" })).toBe(false);
        expect(accepts(rejectionReasonSchema, { code: "model_unavailable", message: "x".repeat(301) })).toBe(false);
    });
});

describe("rejectedCandidateSchema", () => {
    it("requires at least one reason", () => {
        expect(accepts(rejectedCandidateSchema, syntheticRejectedCandidate)).toBe(true);
        expect(accepts(rejectedCandidateSchema, { ...syntheticRejectedCandidate, reasons: [] })).toBe(false);
    });
});

describe("routingDecisionSchema (discriminated on outcome)", () => {
    it("accepts a selected decision", () => {
        expect(accepts(routingDecisionSchema, syntheticSelectedDecision)).toBe(true);
    });

    it("accepts a no_eligible_model decision, including an empty rejected list", () => {
        expect(accepts(routingDecisionSchema, syntheticNoEligibleDecision)).toBe(true);
        expect(accepts(routingDecisionSchema, { ...syntheticNoEligibleDecision, rejected: [] })).toBe(true);
    });

    it("keeps the outcomes distinct", () => {
        expect(
            accepts(routingDecisionSchema, { ...syntheticNoEligibleDecision, selected: syntheticRanked(1, "test-model-a") }),
        ).toBe(false);
        const withoutSelected = clone(syntheticSelectedDecision) as Record<string, unknown>;
        delete withoutSelected.selected;
        expect(accepts(routingDecisionSchema, withoutSelected)).toBe(false);
        expect(accepts(routingDecisionSchema, { ...syntheticSelectedDecision, outcome: "maybe" })).toBe(false);
    });

    it("requires the selected candidate to have rank 1", () => {
        const decision = clone(syntheticSelectedDecision);
        decision.selected.rank = 2;
        decision.fallbacks[0].rank = 3;
        expect(accepts(routingDecisionSchema, decision)).toBe(false);
    });

    it("requires fallback ranks to increase past the selected rank", () => {
        const decision = clone(syntheticSelectedDecision);
        decision.fallbacks[0].rank = 1;
        expect(accepts(routingDecisionSchema, decision)).toBe(false);
    });

    it("rejects a fallback that duplicates the selected model", () => {
        const decision = clone(syntheticSelectedDecision);
        decision.fallbacks.push(syntheticRanked(3, "test-model-a"));
        expect(accepts(routingDecisionSchema, decision)).toBe(false);
    });

    it("bounds the number of fallbacks", () => {
        const decision = clone(syntheticSelectedDecision);
        decision.fallbacks = Array.from({ length: 11 }, (_, i) => syntheticRanked(i + 2, `test-model-${i}`));
        expect(accepts(routingDecisionSchema, decision)).toBe(false);
    });

    it("treats estimates as optional (unknown), never zero-filled", () => {
        const decision = clone(syntheticSelectedDecision);
        const selectedWithoutEstimates = { ...decision.selected };
        delete selectedWithoutEstimates.estimatedCostUsd;
        delete selectedWithoutEstimates.estimatedLatencyMs;
        decision.selected = selectedWithoutEstimates;
        const result = routingDecisionSchema.safeParse(decision);
        expect(result.success).toBe(true);
        if (result.success && result.data.outcome === "selected") {
            expect(result.data.selected.estimatedCostUsd).toBeUndefined();
        }
    });
});