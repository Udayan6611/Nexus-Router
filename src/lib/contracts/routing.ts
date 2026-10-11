import { z } from "zod";
import {
    CAPABILITIES,
    capabilitySchema,
    metadataFieldSchema,
    qualityTierSchema,
} from "@/lib/contracts/catalogue";
import {
    MAX_LATENCY_MS,
    MAX_TOKENS,
    confidenceSchema,
    isoTimestampSchema,
    latencyMsSchema,
    modelIdSchema,
    modelRefShape,
    providerIdSchema,
    tokenCountSchema,
    uniqueItems,
    usdSchema,
} from "@/lib/contracts/primitives";

export const TASK_TYPES = [
    "general_chat",
    "summarization",
    "extraction",
    "classification",
    "code",
    "reasoning",
    "translation",
    "creative_writing",
    "other",
] as const;
export const taskTypeSchema = z.enum(TASK_TYPES);
export type TaskType = z.infer<typeof taskTypeSchema>;

/** Ordered from lowest to highest. Low confidence must be treated as higher complexity (Module 3). */
export const COMPLEXITY_LEVELS = ["low", "medium", "high"] as const;
export const complexityLevelSchema = z.enum(COMPLEXITY_LEVELS);
export type ComplexityLevel = z.infer<typeof complexityLevelSchema>;

export const OPTIMIZATION_PREFERENCES = ["cost", "latency", "quality"] as const;
export const optimizationPreferenceSchema = z.enum(OPTIMIZATION_PREFERENCES);
export type OptimizationPreference = z.infer<typeof optimizationPreferenceSchema>;

/** EXPLICIT, user-stated HARD constraints. Never relaxed silently. */
export const explicitConstraintsSchema = z
    .strictObject({
        maxCostUsd: z.number().positive().max(10_000).optional(),
        maxLatencyMs: z.int().min(1).max(MAX_LATENCY_MS).optional(),
        requiredCapabilities: uniqueItems(capabilitySchema, CAPABILITIES.length).optional(),
        minContextWindowTokens: z.int().min(1).max(MAX_TOKENS).optional(),
        minQualityTier: qualityTierSchema.optional(),
        allowedProviders: uniqueItems(providerIdSchema, 32).optional(),
        blockedProviders: uniqueItems(providerIdSchema, 32).optional(),
    })
    .refine(
        (constraints) => {
            const blocked = constraints.blockedProviders;
            return (
                !constraints.allowedProviders ||
                !blocked ||
                !constraints.allowedProviders.some((provider) => blocked.includes(provider))
            );
        },
        { message: "A provider cannot be both allowed and blocked", path: ["blockedProviders"] },
    );
export type ExplicitConstraints = z.infer<typeof explicitConstraintsSchema>;

function inferredValue<T extends z.ZodType>(value: T) {
    return z.strictObject({ value, confidence: confidenceSchema });
}

/**
 * INFERRED requirements and preferences (heuristic or AI-assisted), each with confidence.
 * Deliberately has no cost, latency or other hard-constraint fields: inferred values can
 * inform ranking but can never relax or replace explicit constraints.
 */
export const inferredRequirementsSchema = z.strictObject({
    source: z.enum(["heuristic", "ai_assisted"]),
    taskType: inferredValue(taskTypeSchema).optional(),
    complexity: inferredValue(complexityLevelSchema).optional(),
    estimatedInputTokens: inferredValue(tokenCountSchema).optional(),
    estimatedOutputTokens: inferredValue(tokenCountSchema).optional(),
    likelyCapabilities: inferredValue(uniqueItems(capabilitySchema, CAPABILITIES.length)).optional(),
});
export type InferredRequirements = z.infer<typeof inferredRequirementsSchema>;

/**
 * ADVISORY shortlist from AI modules. Never authoritative. An empty shortlist means
 * "no advice". It is NOT a routing outcome and is unrelated to no_eligible_model.
 */
export const advisoryShortlistSchema = z.strictObject({
    source: z.literal("ai_advisory"),
    modelIds: z.array(modelIdSchema).max(20),
    rationale: z.string().max(1000).optional(),
});
export type AdvisoryShortlist = z.infer<typeof advisoryShortlistSchema>;

const routeRequestShape = {
    preference: optimizationPreferenceSchema,
    constraints: explicitConstraintsSchema,
    taskType: taskTypeSchema.optional(),
};

/** Client-facing routing request. Strict: internal fields (inferred, advisory, ...) are rejected. */
export const routeRequestSchema = z.strictObject(routeRequestShape);
export type RouteRequest = z.infer<typeof routeRequestSchema>;

/** INTERNAL routing input built by the server. Never parse this from a client body. */
export const routingInputSchema = z.strictObject({
    ...routeRequestShape,
    inferred: inferredRequirementsSchema.optional(),
    advisory: advisoryShortlistSchema.optional(),
});
export type RoutingInput = z.infer<typeof routingInputSchema>;

// Rejection reasons
const reasonMessage = z.string().min(1).max(300);

export const rejectionReasonSchema = z.discriminatedUnion("code", [
    z.strictObject({
        code: z.literal("exceeds_max_cost"),
        message: reasonMessage,
        estimatedCostUsd: usdSchema,
        maxCostUsd: usdSchema,
    }),
    z.strictObject({
        code: z.literal("exceeds_max_latency"),
        message: reasonMessage,
        estimatedLatencyMs: latencyMsSchema,
        maxLatencyMs: latencyMsSchema,
    }),
    z.strictObject({
        code: z.literal("missing_capability"),
        message: reasonMessage,
        capability: capabilitySchema,
        support: z.enum(["unsupported", "unknown"]),
    }),
    z.strictObject({
        code: z.literal("context_window_too_small"),
        message: reasonMessage,
        requiredTokens: tokenCountSchema,
        availableTokens: tokenCountSchema,
    }),
    z.strictObject({
        code: z.literal("below_min_quality"),
        message: reasonMessage,
        requiredTier: qualityTierSchema,
        actualTier: qualityTierSchema,
    }),
    z.strictObject({
        code: z.literal("provider_not_allowed"),
        message: reasonMessage,
        provider: providerIdSchema,
    }),
    z.strictObject({
        code: z.literal("provider_blocked"),
        message: reasonMessage,
        provider: providerIdSchema,
    }),
    z.strictObject({ code: z.literal("model_unavailable"), message: reasonMessage }),
    z.strictObject({ code: z.literal("simulated_unavailable"), message: reasonMessage }),
    z.strictObject({
        code: z.literal("metadata_unknown"),
        message: reasonMessage,
        field: metadataFieldSchema,
    }),
    z.strictObject({
        code: z.literal("metadata_stale"),
        message: reasonMessage,
        field: metadataFieldSchema,
    }),
    z.strictObject({
        code: z.literal("insufficient_deadline"),
        message: reasonMessage,
        remainingMs: latencyMsSchema,
        requiredMs: latencyMsSchema,
    }),
]);
export type RejectionReason = z.infer<typeof rejectionReasonSchema>;
export type RejectionCode = RejectionReason["code"];

// Candidate evaluation. Models are referenced by {modelId, provider}, never copied.
/** Absent estimate = unknown. Never zero. */
const estimatesShape = {
    estimatedCostUsd: usdSchema.optional(),
    estimatedLatencyMs: latencyMsSchema.optional(),
};

export const eligibleCandidateSchema = z.strictObject({
    status: z.literal("eligible"),
    ...modelRefShape,
    ...estimatesShape,
});
export type EligibleCandidate = z.infer<typeof eligibleCandidateSchema>;

export const rejectedCandidateSchema = z.strictObject({
    status: z.literal("rejected"),
    ...modelRefShape,
    reasons: z.array(rejectionReasonSchema).min(1).max(20),
});
export type RejectedCandidate = z.infer<typeof rejectedCandidateSchema>;

export const candidateEvaluationSchema = z.discriminatedUnion("status", [
    eligibleCandidateSchema,
    rejectedCandidateSchema,
]);
export type CandidateEvaluation = z.infer<typeof candidateEvaluationSchema>;

export const rankedCandidateSchema = z.strictObject({
    rank: z.int().min(1).max(500),
    ...modelRefShape,
    ...estimatesShape,
    qualityTier: qualityTierSchema.optional(),
    explanation: z.string().min(1).max(500),
});
export type RankedCandidate = z.infer<typeof rankedCandidateSchema>;

// Routing decision
const decisionCommon = {
    preference: optimizationPreferenceSchema,
    /** Supplied by the caller, so the Module 3 engine stays pure. */
    decidedAt: isoTimestampSchema,
    consideredCount: z.int().min(0).max(100_000),
    rejected: z.array(rejectedCandidateSchema).max(500),
};

const selectedDecisionSchema = z
    .strictObject({
        outcome: z.literal("selected"),
        ...decisionCommon,
        selected: rankedCandidateSchema,
        /** Pre-qualified runners-up. Must be re-validated at fallback time against the
         * original constraints and the remaining deadline. */
        fallbacks: z.array(rankedCandidateSchema).max(10),
    })
    .superRefine((decision, ctx) => {
        if (decision.selected.rank !== 1) {
            ctx.addIssue({
                code: "custom",
                message: "The selected candidate must have rank 1",
                path: ["selected", "rank"],
            });
        }
        let previousRank = decision.selected.rank;
        decision.fallbacks.forEach((fallback, index) => {
            if (fallback.rank <= previousRank) {
                ctx.addIssue({
                    code: "custom",
                    message: "Fallback ranks must be strictly increasing and greater than the selected rank",
                    path: ["fallbacks", index, "rank"],
                });
            }
            previousRank = fallback.rank;
            if (fallback.modelId === decision.selected.modelId) {
                ctx.addIssue({
                    code: "custom",
                    message: "A fallback must differ from the selected model",
                    path: ["fallbacks", index, "modelId"],
                });
            }
        });
    });

const noEligibleModelDecisionSchema = z.strictObject({
    outcome: z.literal("no_eligible_model"),
    ...decisionCommon,
    summary: z.string().min(1).max(500),
});

export const routingDecisionSchema = z.discriminatedUnion("outcome", [
    selectedDecisionSchema,
    noEligibleModelDecisionSchema,
]);
export type RoutingDecision = z.infer<typeof routingDecisionSchema>;
export type RoutingOutcome = RoutingDecision["outcome"];