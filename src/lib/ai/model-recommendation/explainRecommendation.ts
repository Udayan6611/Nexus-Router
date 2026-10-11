import {
    ROUTER_NOTICE,
    type AiTaskRequirements,
    type ModelRecommendation,
    type RecommendModelsOptions,
} from "@/lib/ai/contracts";
import type { Dim, Ranked, RankingResult } from "./rankCandidates";

const factsOf = (r: Ranked) => r.evaluation.facts;

function dimValueText(r: Ranked, d: Dim): string | undefined {
    const f = factsOf(r);
    if (d === "cost") {
        return f.blendedPricePerMTok === undefined
            ? undefined
            : `${f.blendedPricePerMTok} USD per 1M tokens (input + output)`;
    }
    if (d === "latency") {
        return f.medianLatencyMs === undefined ? undefined : `${f.medianLatencyMs} ms median latency`;
    }
    return f.qualityTier === undefined ? undefined : `${f.qualityTier} quality tier`;
}

/** Every sentence is built from requirements or supplied catalogue values; nothing is fabricated. */
export function explainRecommendation(
    r: Ranked,
    all: RankingResult,
    req: AiTaskRequirements,
    opts: RecommendModelsOptions,
    rank: number,
): ModelRecommendation {
    const f = factsOf(r);
    const ev = r.evaluation;
    const reasons: string[] = [];
    const tradeoffs: string[] = [];
    const limitations: string[] = [];
    const pref = req.optimization;
    const relevant = (d: Dim) => pref === d || pref === "balanced";

    // 1. Reasons
    if (ev.taskFit === "supported") {
        reasons.push(
            req.taskType === "general"
                ? "Catalogue lists general-purpose support."
                : `Catalogue documents support for ${req.taskType} tasks.`,
        );
    } else {
        reasons.push("General task: no specific capability is required and the catalogue documents no mismatch.");
    }

    if (ev.contextFit === "supported" && f.contextWindowTokens !== undefined) {
        reasons.push(`Documented context window (${f.contextWindowTokens} tokens) covers the estimated input.`);
    }

    if (pref === "unspecified") {
        reasons.push(
            "No optimization preference was stated; ordering reflects task support and how much metadata is documented.",
        );
    }

    for (const d of ["cost", "latency", "quality"] as const) {
        if (!relevant(d)) continue;
        const text = dimValueText(r, d);
        const info = r.dims[d];
        if (text && info) {
            const where =
                info.comparable >= 2
                    ? ` (position ${info.position} of ${info.comparable} candidates with documented data)`
                    : "";
            reasons.push(`Documented ${text}${where}.`);
        }
    }

    // 2. Trade-offs: Documented differences vs best candidate in dimension
    for (const d of ["cost", "latency", "quality"] as const) {
        const bestId = all.bestByDim[d];
        const info = r.dims[d];
        if (!bestId || !info || info.position === 1 || bestId === f.id) continue;
        const best = all.ranked.find((x) => factsOf(x).id === bestId);
        const mine = dimValueText(r, d);
        const theirs = best ? dimValueText(best, d) : undefined;
        if (!mine || !theirs) continue;
        const label =
            d === "cost"
                ? "Higher documented price"
                : d === "latency"
                    ? "Higher documented latency"
                    : "Lower documented quality";
        tradeoffs.push(`${label} than ${bestId}: ${mine} vs ${theirs}.`);
    }

    // 3. Limitations: catalogue limitations verbatim, then honest unknowns
    limitations.push(...f.knownLimitations);
    if (f.blendedPricePerMTok === undefined && relevant("cost")) {
        limitations.push("Price is not available (or incomplete) in the catalogue; cost cannot be compared.");
    }
    if (f.medianLatencyMs === undefined && relevant("latency")) {
        limitations.push("Latency is not available in the catalogue; speed cannot be compared.");
    }
    if (f.qualityTier === undefined && relevant("quality")) {
        limitations.push("Quality tier is not available in the catalogue; quality cannot be compared.");
    }
    const longInputTask = req.taskType === "document_analysis" || req.taskType === "summarization";
    if (f.contextWindowTokens === undefined && (longInputTask || opts.estimatedInputTokens !== undefined)) {
        limitations.push(
            "Context window is not available in the catalogue; suitability for the full input cannot be confirmed.",
        );
    }
    if (req.uncertainty.clarificationNeeded) {
        limitations.push("The request is ambiguous; this recommendation may change after clarification.");
    }
    if (req.explicitConstraints.length > 0) {
        limitations.push(
            `${req.explicitConstraints.length} explicit constraint(s) were not checked against catalogue metadata; hard constraints are applied by the router.`,
        );
    }
    if (req.inferredRequirements.length > 0) {
        limitations.push(
            `${req.inferredRequirements.length} inferred requirement(s) were treated as advisory only and did not exclude any candidate.`,
        );
    }
    limitations.push(ROUTER_NOTICE);

    return { modelId: f.id, rank, reasons, tradeoffs, limitations };
}
