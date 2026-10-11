import type {
    Capability,
    ModelMetadata,
    QualityTier,
} from "@/lib/contracts/catalogue";
import {
    type ComplexityLevel,
    type ExplicitConstraints,
    type OptimizationPreference,
    type TaskType,
} from "@/lib/contracts/routing";

// ============================================================================
// 1. Result Pattern (Functional, Internal to AI subsystem)
// ============================================================================

export interface AiModuleError {
    code: string;
    message: string;
    retryable?: boolean;
}

export type Result<T, E = AiModuleError> =
    | { ok: true; data: T }
    | { ok: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export const err = <E = AiModuleError>(error: E): Result<never, E> => ({ ok: false, error });

// ============================================================================
// 2. AI Task Understanding Contract Types
// ============================================================================

export const AI_TASK_TYPES = [
    "coding",
    "reasoning",
    "summarization",
    "document_analysis",
    "multimodal",
    "general",
] as const;
export type AiTaskType = (typeof AI_TASK_TYPES)[number];

export const AI_COMPLEXITIES = ["low", "medium", "high", "unknown"] as const;
export type AiComplexity = (typeof AI_COMPLEXITIES)[number];

export const AI_OPTIMIZATIONS = ["cost", "latency", "quality", "balanced", "unspecified"] as const;
export type AiOptimization = (typeof AI_OPTIMIZATIONS)[number];

export interface ExplicitUserConstraint {
    provenance: "explicit";
    text: string;
    evidence: string;
}

export interface InferredUserRequirement {
    provenance: "inferred";
    text: string;
    confidence: number;
    rationale: string;
}

export interface TaskUncertainty {
    score: number;
    clarificationNeeded: boolean;
    reasons: string[];
}

export interface AiTaskRequirements {
    taskType: AiTaskType;
    complexity: AiComplexity;
    optimization: AiOptimization;
    explicitConstraints: ExplicitUserConstraint[];
    inferredRequirements: InferredUserRequirement[];
    uncertainty: TaskUncertainty;
    summary: string;
}

export interface TaskUnderstandingInput {
    prompt: string;
    source: "typed" | "document" | "voice";
    sessionId?: string;
}

// ============================================================================
// 3. Explicit Mappings to Backend Canonical Routing Schemas
// ============================================================================

/**
 * Maps AI task type to canonical backend TaskType enum.
 */
export function mapAiTaskTypeToBackend(taskType: AiTaskType): TaskType {
    switch (taskType) {
        case "coding":
            return "code";
        case "reasoning":
            return "reasoning";
        case "summarization":
            return "summarization";
        case "document_analysis":
            return "extraction";
        case "multimodal":
            return "other";
        case "general":
        default:
            return "general_chat";
    }
}

/**
 * Maps AI optimization preference to canonical backend OptimizationPreference.
 * "balanced" and "unspecified" safely default to "cost".
 */
export function mapAiOptimizationToBackend(opt: AiOptimization): OptimizationPreference {
    switch (opt) {
        case "cost":
            return "cost";
        case "latency":
            return "latency";
        case "quality":
            return "quality";
        case "balanced":
        case "unspecified":
        default:
            return "cost";
    }
}

/**
 * Maps AI complexity to backend ComplexityLevel.
 * "unknown" is conservatively mapped to "high" (conservative uncertainty handling).
 */
export function mapAiComplexityToBackend(complexity: AiComplexity): ComplexityLevel {
    switch (complexity) {
        case "low":
            return "low";
        case "medium":
            return "medium";
        case "high":
        case "unknown":
        default:
            return "high";
    }
}

/**
 * Extracts hard constraints from explicit user statements ONLY.
 * Inferred requirements are strictly ignored and never promoted to hard constraints.
 */
export function extractExplicitConstraintsFromAi(
    explicitConstraints: readonly ExplicitUserConstraint[],
): Partial<ExplicitConstraints> {
    const result: Partial<ExplicitConstraints> = {};
    const requiredCaps = new Set<Capability>();

    for (const constraint of explicitConstraints) {
        const text = constraint.text.toLowerCase();

        // 1. Max Cost / Budget: e.g., "max cost $0.005", "under $0.01", "budget 0.001"
        const costMatch = text.match(/(?:max(?:imum)?\s+cost|under|below|budget|less\s+than)\s*\$?([0-9]+(?:\.[0-9]+)?)/i);
        if (costMatch?.[1]) {
            const costVal = parseFloat(costMatch[1]);
            if (Number.isFinite(costVal) && costVal > 0) {
                if (result.maxCostUsd === undefined || costVal < result.maxCostUsd) {
                    result.maxCostUsd = costVal;
                }
            }
        }

        // 2. Max Latency: e.g., "under 200ms", "latency < 300ms", "faster than 500ms"
        const latMatch = text.match(/(?:under|below|faster\s+than|latency\s*(?:<|under)?)\s*([0-9]+)\s*ms/i);
        if (latMatch?.[1]) {
            const latVal = parseInt(latMatch[1], 10);
            if (Number.isFinite(latVal) && latVal > 0) {
                if (result.maxLatencyMs === undefined || latVal < result.maxLatencyMs) {
                    result.maxLatencyMs = latVal;
                }
            }
        }

        // 3. Min Context Tokens: e.g., "at least 32000 tokens", "context 128k"
        const ctxKMatch = text.match(/([0-9]+)\s*k\s*(?:tokens|context)/i);
        if (ctxKMatch?.[1]) {
            const ctxVal = parseInt(ctxKMatch[1], 10) * 1000;
            if (result.minContextWindowTokens === undefined || ctxVal > result.minContextWindowTokens) {
                result.minContextWindowTokens = ctxVal;
            }
        }

        // 4. Required Capabilities
        if (/\b(?:vision|image|multimodal)\b/i.test(text)) {
            requiredCaps.add("vision");
        }
        if (/\b(?:tool[_\s]*use|function[_\s]*call)\b/i.test(text)) {
            requiredCaps.add("tool_use");
        }
        if (/\b(?:json[_\s]*output|structured[_\s]*output)\b/i.test(text)) {
            requiredCaps.add("json_output");
        }
        if (/\b(?:stream(?:ing)?)\b/i.test(text)) {
            requiredCaps.add("streaming");
        }
        if (/\b(?:code|coding)\b/i.test(text)) {
            requiredCaps.add("code");
        }
        if (/\b(?:reasoning|deep[_\s]*think)\b/i.test(text)) {
            requiredCaps.add("reasoning");
        }

        // 5. Allowed / Blocked Providers
        if (/\b(?:only\s+use|only)\s+groq\b/i.test(text)) {
            result.allowedProviders = ["groq"];
        } else if (/\b(?:only\s+use|only)\s+simulator\b/i.test(text)) {
            result.allowedProviders = ["simulator"];
        }

        if (/\b(?:never\s+use|do\s+not\s+use|block)\s+simulator\b/i.test(text)) {
            result.blockedProviders = [...(result.blockedProviders ?? []), "simulator"];
        } else if (/\b(?:never\s+use|do\s+not\s+use|block)\s+groq\b/i.test(text)) {
            result.blockedProviders = [...(result.blockedProviders ?? []), "groq"];
        }
    }

    if (requiredCaps.size > 0) {
        result.requiredCapabilities = Array.from(requiredCaps);
    }

    return result;
}

/**
 * Maps high-level AI task requirements into a canonical routing request.
 */
export function mapAiRequirementsToBackendRouting(
    req: AiTaskRequirements,
): {
    taskType: TaskType;
    preference: OptimizationPreference;
    constraints: Partial<ExplicitConstraints>;
} {
    return {
        taskType: mapAiTaskTypeToBackend(req.taskType),
        preference: mapAiOptimizationToBackend(req.optimization),
        constraints: extractExplicitConstraintsFromAi(req.explicitConstraints),
    };
}

// ============================================================================
// 4. Model Candidate & Catalogue Adapter
// ============================================================================

export interface ModelCandidate {
    id: string; // Exact canonical catalogue ID
    displayName?: string;
    provider?: string;
    supportedTaskTypes?: AiTaskType[];
    inputModalities?: ("text" | "image" | "audio" | "video" | "document")[];
    contextWindowTokens?: number;
    pricing?: { inputPerMTokUsd?: number; outputPerMTokUsd?: number };
    latency?: { medianMs?: number };
    qualityTier?: QualityTier;
    knownLimitations?: string[];
}

/**
 * Converts a canonical ModelMetadata record into a ModelCandidate for recommendation scoring.
 * Preserves canonical model IDs exactly and extracts known metadata dimensions.
 */
export function catalogueToCandidate(metadata: ModelMetadata): ModelCandidate {
    const supportedTaskTypes: AiTaskType[] = ["general"];
    const inputModalities: ("text" | "image" | "audio" | "video" | "document")[] = ["text"];

    // Inspect capabilities
    for (const cap of metadata.capabilities) {
        if (cap.supported.status === "known" && cap.supported.value) {
            if (cap.capability === "code") supportedTaskTypes.push("coding");
            if (cap.capability === "reasoning") supportedTaskTypes.push("reasoning");
            if (cap.capability === "vision") {
                supportedTaskTypes.push("multimodal");
                inputModalities.push("image");
            }
        }
    }

    const contextTokens =
        metadata.contextWindow.status === "known"
            ? metadata.contextWindow.value.contextWindowTokens
            : undefined;

    const pricing =
        metadata.pricing.status === "known"
            ? {
                inputPerMTokUsd: metadata.pricing.value.inputUsdPerMillionTokens,
                outputPerMTokUsd: metadata.pricing.value.outputUsdPerMillionTokens,
            }
            : undefined;

    const latency =
        metadata.latency.status === "known"
            ? { medianMs: metadata.latency.value.p50Ms }
            : undefined;

    const qualityTier =
        metadata.quality.status === "known" ? metadata.quality.value.tier : undefined;

    const knownLimitations: string[] = [];
    if (metadata.contextWindow.status !== "known") {
        knownLimitations.push("Context window size is not confirmed in catalogue.");
    }
    if (metadata.pricing.status !== "known") {
        knownLimitations.push("Pricing is not confirmed in catalogue.");
    }
    if (metadata.latency.status !== "known") {
        knownLimitations.push("Latency benchmark is not confirmed in catalogue.");
    }
    if (metadata.quality.status !== "known") {
        knownLimitations.push("Quality tier is unverified.");
    }

    return {
        id: metadata.id, // Preserves exact canonical ID
        displayName: metadata.displayName,
        provider: metadata.provider,
        supportedTaskTypes,
        inputModalities,
        contextWindowTokens: contextTokens,
        pricing,
        latency,
        qualityTier,
        knownLimitations,
    };
}

export function catalogueListToCandidates(models: readonly ModelMetadata[]): ModelCandidate[] {
    return models.map(catalogueToCandidate);
}

// ============================================================================
// 5. Model Recommendation Contracts
// ============================================================================

export interface ModelRecommendation {
    modelId: string;
    rank: number;
    reasons: string[];
    tradeoffs: string[];
    limitations: string[];
}

export interface ExcludedCandidate {
    modelId: string;
    reason: string;
}

export interface RecommendationDiagnostics {
    recommendations: ModelRecommendation[];
    excluded: ExcludedCandidate[];
    emptyReason?: string;
}

export interface RecommendModelsOptions {
    estimatedInputTokens?: number;
}

export const ROUTER_NOTICE =
    "This is a recommendation only; final eligibility and routing are decided by the deterministic router.";

/**
 * Filters advisory recommendations against router-eligible candidates.
 * AI output is never permitted to bypass eligibility checks or hard constraints.
 */
export function filterRecommendationsByRouterEligibility<T extends { modelId: string }>(
    recommendations: readonly T[],
    eligibleModelIds: readonly string[],
): T[] {
    const eligibleSet = new Set(eligibleModelIds);
    return recommendations.filter((r) => eligibleSet.has(r.modelId));
}
