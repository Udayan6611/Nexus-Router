import type { AiTaskRequirements } from "@/lib/ai/contracts";
import { QUALITY_TIERS, type CandidateFacts, type Evaluation } from "./evaluateCandidate";

export type Dim = "cost" | "latency" | "quality";
export const DIMS: readonly Dim[] = ["cost", "latency", "quality"];

export interface DimInfo {
    /** 1 = best among comparable candidates (ties share a position). */
    position: number;
    /** Number of candidates with a known value in this dimension. */
    comparable: number;
    /** 0 = best, 1 = worst, among comparable candidates. */
    percentile: number;
}

export interface Ranked {
    evaluation: Evaluation;
    dims: Partial<Record<Dim, DimInfo>>;
}

export interface RankingResult {
    ranked: Ranked[];
    /** Best candidate id per dimension, only when at least two candidates are comparable. */
    bestByDim: Partial<Record<Dim, string>>;
}

/** Lower key = better. Undefined = unknown. */
function dimKey(f: CandidateFacts, d: Dim): number | undefined {
    if (d === "cost") return f.blendedPricePerMTok;
    if (d === "latency") return f.medianLatencyMs;
    return f.qualityTier === undefined
        ? undefined
        : -(QUALITY_TIERS as readonly string[]).indexOf(f.qualityTier);
}

/**
 * Deterministic ranking policy:
 *  1. Task fit: documented support before "general, no documented mismatch".
 *  2. Preference:
 *     cost / latency / quality -> known values first, better value first; unknown values never get an advantage.
 *     balanced -> mean percentile over active dimensions.
 *     unspecified -> no preference ordering.
 *  3. Evidence completeness (more documented metadata first).
 *  4. Candidate id ascending (stable tie-break).
 */
export function rankCandidates(
    evaluations: Evaluation[],
    optimization: AiTaskRequirements["optimization"],
): RankingResult {
    const infos = new Map<Evaluation, Partial<Record<Dim, DimInfo>>>();
    evaluations.forEach((e) => infos.set(e, {}));

    const activeDims: Dim[] = [];
    for (const d of DIMS) {
        const known = evaluations
            .map((e) => ({ e, key: dimKey(e.facts, d) }))
            .filter((x): x is { e: Evaluation; key: number } => x.key !== undefined);
        if (known.length === 0) continue;
        activeDims.push(d);
        const unique = Array.from(new Set(known.map((k) => k.key))).sort((a, b) => a - b);
        for (const { e, key } of known) {
            const idx = unique.indexOf(key);
            infos.get(e)![d] = {
                position: idx + 1,
                comparable: known.length,
                percentile: unique.length > 1 ? idx / (unique.length - 1) : 0,
            };
        }
    }

    const prefScore = (e: Evaluation): number => {
        const dims = infos.get(e)!;
        if (optimization === "cost" || optimization === "latency" || optimization === "quality") {
            const info = dims[optimization];
            return info ? info.percentile : 2; // unknown ranks after every known value
        }
        if (optimization === "balanced" && activeDims.length > 0) {
            const total = activeDims.reduce((s, d) => s + (dims[d]?.percentile ?? 1), 0);
            return total / activeDims.length;
        }
        return 0;
    };

    const fitRank = (e: Evaluation) => (e.taskFit === "supported" ? 0 : 1);
    const sorted = [...evaluations].sort(
        (a, b) =>
            fitRank(a) - fitRank(b) ||
            prefScore(a) - prefScore(b) ||
            b.evidenceCount - a.evidenceCount ||
            (a.facts.id < b.facts.id ? -1 : a.facts.id > b.facts.id ? 1 : 0),
    );

    const ranked: Ranked[] = sorted.map((evaluation) => ({
        evaluation,
        dims: infos.get(evaluation)!,
    }));
    const bestByDim: Partial<Record<Dim, string>> = {};
    for (const d of activeDims) {
        const first = ranked.find((r) => r.dims[d]?.position === 1);
        if (first && (first.dims[d]?.comparable ?? 0) >= 2) {
            bestByDim[d] = first.evaluation.facts.id;
        }
    }
    return { ranked, bestByDim };
}
