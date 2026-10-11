import type {
    ModelMetadata,
    QualityTier,
} from "@/lib/contracts/catalogue";
import type {
    CandidateEvaluation,
    EligibleCandidate,
    ExplicitConstraints,
    RankedCandidate,
    RejectedCandidate,
    RejectionReason,
    RoutingDecision,
    RoutingInput,
} from "@/lib/contracts/routing";

const QUALITY_ORDER: Record<QualityTier, number> = {
    basic: 1,
    standard: 2,
    advanced: 3,
    frontier: 4,
};

const DEFAULT_INPUT_TOKENS = 1_000;
const DEFAULT_OUTPUT_TOKENS = 500;

export interface TokenEstimates {
    readonly inputTokens: number;
    readonly outputTokens: number;
}

export function estimateCostUsd(
    model: ModelMetadata,
    tokens: TokenEstimates = { inputTokens: DEFAULT_INPUT_TOKENS, outputTokens: DEFAULT_OUTPUT_TOKENS },
): number | undefined {
    if (model.pricing.status !== "known" && model.pricing.status !== "stale") {
        return undefined;
    }
    const { inputUsdPerMillionTokens, outputUsdPerMillionTokens } = model.pricing.value;
    const cost =
        (tokens.inputTokens / 1_000_000) * inputUsdPerMillionTokens +
        (tokens.outputTokens / 1_000_000) * outputUsdPerMillionTokens;
    return Number(cost.toFixed(6));
}

export function evaluateCandidate(
    model: ModelMetadata,
    constraints: ExplicitConstraints,
    tokenEstimates: TokenEstimates = { inputTokens: DEFAULT_INPUT_TOKENS, outputTokens: DEFAULT_OUTPUT_TOKENS },
    remainingDeadlineMs?: number,
): CandidateEvaluation {
    const reasons: RejectionReason[] = [];

    // 1. Provider allowed / blocked checks
    if (constraints.allowedProviders && !constraints.allowedProviders.includes(model.provider)) {
        reasons.push({
            code: "provider_not_allowed",
            message: `Provider '${model.provider}' is not in the allowed list`,
            provider: model.provider,
        });
    }

    if (constraints.blockedProviders && constraints.blockedProviders.includes(model.provider)) {
        reasons.push({
            code: "provider_blocked",
            message: `Provider '${model.provider}' is blocked by explicit constraints`,
            provider: model.provider,
        });
    }

    // 2. Availability checks
    if (model.availability.status === "known") {
        if (model.availability.value === "unavailable") {
            reasons.push({
                code: "model_unavailable",
                message: `Model '${model.id}' is currently marked unavailable`,
            });
        }
    } else if (model.availability.status === "stale") {
        reasons.push({
            code: "metadata_stale",
            message: `Availability metadata for '${model.id}' is stale`,
            field: "availability",
        });
    } else {
        reasons.push({
            code: "metadata_unknown",
            message: `Availability for '${model.id}' is unknown`,
            field: "availability",
        });
    }

    // 3. Required Capabilities
    if (constraints.requiredCapabilities) {
        for (const reqCap of constraints.requiredCapabilities) {
            const entry = model.capabilities.find((c) => c.capability === reqCap);
            if (!entry || entry.supported.status === "unknown") {
                reasons.push({
                    code: "missing_capability",
                    message: `Capability '${reqCap}' is unknown for model '${model.id}'`,
                    capability: reqCap,
                    support: "unknown",
                });
            } else if (entry.supported.status === "stale") {
                reasons.push({
                    code: "metadata_stale",
                    message: `Capability '${reqCap}' information is stale for '${model.id}'`,
                    field: "capabilities",
                });
            } else if (entry.supported.value === false) {
                reasons.push({
                    code: "missing_capability",
                    message: `Capability '${reqCap}' is not supported by model '${model.id}'`,
                    capability: reqCap,
                    support: "unsupported",
                });
            }
        }
    }

    // 4. Context Window
    if (constraints.minContextWindowTokens !== undefined) {
        if (model.contextWindow.status === "known") {
            const available = model.contextWindow.value.contextWindowTokens;
            if (available < constraints.minContextWindowTokens) {
                reasons.push({
                    code: "context_window_too_small",
                    message: `Context window of ${available} tokens is smaller than required ${constraints.minContextWindowTokens}`,
                    requiredTokens: constraints.minContextWindowTokens,
                    availableTokens: available,
                });
            }
        } else if (model.contextWindow.status === "stale") {
            reasons.push({
                code: "metadata_stale",
                message: `Context window metadata is stale for '${model.id}'`,
                field: "contextWindow",
            });
        } else {
            reasons.push({
                code: "metadata_unknown",
                message: `Context window is unknown for '${model.id}'`,
                field: "contextWindow",
            });
        }
    }

    // 5. Quality Tier
    if (constraints.minQualityTier !== undefined) {
        if (model.quality.status === "known") {
            const actualTier = model.quality.value.tier;
            if (QUALITY_ORDER[actualTier] < QUALITY_ORDER[constraints.minQualityTier]) {
                reasons.push({
                    code: "below_min_quality",
                    message: `Quality tier '${actualTier}' is below required '${constraints.minQualityTier}'`,
                    requiredTier: constraints.minQualityTier,
                    actualTier,
                });
            }
        } else if (model.quality.status === "stale") {
            reasons.push({
                code: "metadata_stale",
                message: `Quality tier metadata is stale for '${model.id}'`,
                field: "quality",
            });
        } else {
            reasons.push({
                code: "metadata_unknown",
                message: `Quality tier is unknown for '${model.id}'`,
                field: "quality",
            });
        }
    }

    // 6. Cost Limit
    const estimatedCost = estimateCostUsd(model, tokenEstimates);
    if (constraints.maxCostUsd !== undefined) {
        if (estimatedCost === undefined) {
            reasons.push({
                code: "metadata_unknown",
                message: `Pricing is unknown for '${model.id}' and cannot satisfy maxCostUsd`,
                field: "pricing",
            });
        } else if (estimatedCost > constraints.maxCostUsd) {
            reasons.push({
                code: "exceeds_max_cost",
                message: `Estimated cost $${estimatedCost.toFixed(6)} exceeds maximum budget $${constraints.maxCostUsd.toFixed(6)}`,
                estimatedCostUsd: estimatedCost,
                maxCostUsd: constraints.maxCostUsd,
            });
        }
    }

    // 7. Latency Limit
    let estimatedLatency: number | undefined;
    if (model.latency.status === "known") {
        estimatedLatency = model.latency.value.p50Ms;
    }

    if (constraints.maxLatencyMs !== undefined) {
        if (estimatedLatency === undefined) {
            reasons.push({
                code: "metadata_unknown",
                message: `Latency is unknown for '${model.id}' and cannot satisfy maxLatencyMs`,
                field: "latency",
            });
        } else if (estimatedLatency > constraints.maxLatencyMs) {
            reasons.push({
                code: "exceeds_max_latency",
                message: `Estimated latency ${estimatedLatency}ms exceeds maximum allowed ${constraints.maxLatencyMs}ms`,
                estimatedLatencyMs: estimatedLatency,
                maxLatencyMs: constraints.maxLatencyMs,
            });
        }
    }

    // 8. Remaining Deadline Check (for execution/fallback)
    if (remainingDeadlineMs !== undefined) {
        const requiredMs = estimatedLatency ?? 1_000;
        if (remainingDeadlineMs < requiredMs) {
            reasons.push({
                code: "insufficient_deadline",
                message: `Remaining deadline ${remainingDeadlineMs}ms is insufficient for estimated latency ${requiredMs}ms`,
                remainingMs: remainingDeadlineMs,
                requiredMs,
            });
        }
    }

    if (reasons.length > 0) {
        return {
            status: "rejected",
            modelId: model.id,
            provider: model.provider,
            reasons,
        };
    }

    return {
        status: "eligible",
        modelId: model.id,
        provider: model.provider,
        ...(estimatedCost !== undefined ? { estimatedCostUsd: estimatedCost } : {}),
        ...(estimatedLatency !== undefined ? { estimatedLatencyMs: estimatedLatency } : {}),
    };
}

export function validateFallback(
    model: ModelMetadata,
    originalConstraints: ExplicitConstraints,
    remainingDeadlineMs: number,
    tokenEstimates: TokenEstimates = { inputTokens: DEFAULT_INPUT_TOKENS, outputTokens: DEFAULT_OUTPUT_TOKENS },
): { eligible: boolean; rejectionReasons?: RejectionReason[] } {
    const evaluation = evaluateCandidate(model, originalConstraints, tokenEstimates, remainingDeadlineMs);
    if (evaluation.status === "rejected") {
        return { eligible: false, rejectionReasons: evaluation.reasons };
    }
    return { eligible: true };
}

export function routeTask(
    input: RoutingInput,
    candidates: readonly ModelMetadata[],
    nowIso: string = new Date().toISOString(),
): RoutingDecision {
    const consideredCount = candidates.length;
    const rejected: RejectedCandidate[] = [];
    const eligible: { candidate: EligibleCandidate; model: ModelMetadata }[] = [];

    const tokenEstimates: TokenEstimates = {
        inputTokens: input.inferred?.estimatedInputTokens?.value ?? DEFAULT_INPUT_TOKENS,
        outputTokens: input.inferred?.estimatedOutputTokens?.value ?? DEFAULT_OUTPUT_TOKENS,
    };

    for (const model of candidates) {
        const evalResult = evaluateCandidate(model, input.constraints, tokenEstimates);
        if (evalResult.status === "rejected") {
            rejected.push(evalResult);
        } else {
            eligible.push({ candidate: evalResult, model });
        }
    }

    if (eligible.length === 0) {
        return {
            outcome: "no_eligible_model",
            preference: input.preference,
            decidedAt: nowIso,
            consideredCount,
            rejected,
            summary: `All ${consideredCount} considered model candidates were rejected against requested constraints.`,
        };
    }

    // Sort eligible candidates by preference
    const advisoryIds = new Set(input.advisory?.modelIds ?? []);

    eligible.sort((a, b) => {
        const aCost = a.candidate.estimatedCostUsd ?? Infinity;
        const bCost = b.candidate.estimatedCostUsd ?? Infinity;
        const aLat = a.candidate.estimatedLatencyMs ?? Infinity;
        const bLat = b.candidate.estimatedLatencyMs ?? Infinity;
        const aQ = a.model.quality.status === "known" ? QUALITY_ORDER[a.model.quality.value.tier] : 0;
        const bQ = b.model.quality.status === "known" ? QUALITY_ORDER[b.model.quality.value.tier] : 0;

        switch (input.preference) {
            case "cost": {
                if (aCost !== bCost) return aCost - bCost;
                if (aLat !== bLat) return aLat - bLat;
                return bQ - aQ;
            }
            case "latency": {
                if (aLat !== bLat) return aLat - bLat;
                if (aCost !== bCost) return aCost - bCost;
                return bQ - aQ;
            }
            case "quality": {
                if (aQ !== bQ) return bQ - aQ;
                if (aCost !== bCost) return aCost - bCost;
                return aLat - bLat;
            }
        }
    });

    const ranked: RankedCandidate[] = eligible.map((item, index) => {
        const rank = index + 1;
        const isAdvised = advisoryIds.has(item.candidate.modelId);
        const explanation = `Rank ${rank}: Optimized for ${input.preference} (est. $${item.candidate.estimatedCostUsd ?? "N/A"}, latency ${item.candidate.estimatedLatencyMs ?? "N/A"}ms)${isAdvised ? " [AI Advisory Recommended]" : ""}`;
        const qualityTier = item.model.quality.status === "known" ? item.model.quality.value.tier : undefined;

        return {
            rank,
            modelId: item.candidate.modelId,
            provider: item.candidate.provider,
            ...(item.candidate.estimatedCostUsd !== undefined ? { estimatedCostUsd: item.candidate.estimatedCostUsd } : {}),
            ...(item.candidate.estimatedLatencyMs !== undefined ? { estimatedLatencyMs: item.candidate.estimatedLatencyMs } : {}),
            ...(qualityTier ? { qualityTier } : {}),
            explanation,
        };
    });

    const selected = ranked[0];
    const fallbacks = ranked.slice(1, 10);

    return {
        outcome: "selected",
        preference: input.preference,
        decidedAt: nowIso,
        consideredCount,
        rejected,
        selected,
        fallbacks,
    };
}
