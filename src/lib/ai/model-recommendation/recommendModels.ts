import { z } from "zod";
import {
    err,
    ok,
    type AiModuleError,
    type AiTaskRequirements,
    type ExcludedCandidate,
    type ModelCandidate,
    type ModelRecommendation,
    type RecommendModelsOptions,
    type RecommendationDiagnostics,
    type Result,
} from "@/lib/ai/contracts";
import { TaskRequirementsSchema } from "@/lib/ai/task-understanding/schemas";
import { evaluateCandidate } from "./evaluateCandidate";
import { explainRecommendation } from "./explainRecommendation";
import { rankCandidates } from "./rankCandidates";

const RecommendationSchema = z.object({
    modelId: z.string().min(1),
    rank: z.number().int().min(1),
    reasons: z.array(z.string().min(1)).min(1),
    tradeoffs: z.array(z.string().min(1)),
    limitations: z.array(z.string().min(1)),
});

/**
 * Recommends models from the SUPPLIED candidate list only.
 * Never fetches or invents candidates, never overrides hard constraints, never throws.
 * Returns full diagnostics, including reasons for excluded candidates.
 */
export async function recommendModelsWithDiagnostics(
    requirements: AiTaskRequirements | unknown,
    candidates: readonly ModelCandidate[] | unknown,
    options: RecommendModelsOptions = {},
): Promise<Result<RecommendationDiagnostics, AiModuleError>> {
    try {
        const req = TaskRequirementsSchema.safeParse(requirements);
        if (!req.success) {
            return err({
                code: "INVALID_REQUIREMENTS",
                message: "requirements do not match the TaskRequirements contract.",
            });
        }

        if (!Array.isArray(candidates)) {
            return err({
                code: "INVALID_CANDIDATES",
                message: "candidates must be an array.",
            });
        }

        const seen = new Set<string>();
        for (const c of candidates as unknown[]) {
            const id = c && typeof c === "object" ? (c as { id?: unknown }).id : undefined;
            if (typeof id !== "string" || id.trim() === "") {
                return err({
                    code: "INVALID_CANDIDATES",
                    message: "every candidate needs a non-empty string id.",
                });
            }
            if (seen.has(id)) {
                return err({
                    code: "DUPLICATE_CANDIDATE_ID",
                    message: `duplicate candidate id in catalogue: ${id}`,
                });
            }
            seen.add(id);
        }

        if (candidates.length === 0) {
            return ok({
                recommendations: [],
                excluded: [],
                emptyReason: "No candidates were supplied.",
            });
        }

        const evaluations = (candidates as ModelCandidate[]).map((c) =>
            evaluateCandidate(req.data as AiTaskRequirements, c, options),
        );

        const excluded: ExcludedCandidate[] = evaluations
            .filter((e) => !e.recommendable)
            .map((e) => ({
                modelId: e.facts.id,
                reason: e.notRecommendedReason ?? "Insufficient catalogue evidence.",
            }));

        const recommendable = evaluations.filter((e) => e.recommendable);
        const ranking = rankCandidates(recommendable, req.data.optimization);

        const recommendations: ModelRecommendation[] = ranking.ranked.map((r, i) =>
            explainRecommendation(r, ranking, req.data as AiTaskRequirements, options, i + 1),
        );

        // Defensive integrity validation
        for (const rec of recommendations) {
            if (!RecommendationSchema.safeParse(rec).success || !seen.has(rec.modelId)) {
                return err({
                    code: "INTERNAL_ERROR",
                    message: "Recommendation failed integrity validation.",
                });
            }
        }

        return ok({
            recommendations,
            excluded,
            emptyReason:
                recommendations.length === 0
                    ? "No supplied candidate had enough catalogue evidence to be recommended for this task."
                    : undefined,
        });
    } catch {
        return err({
            code: "INTERNAL_ERROR",
            message: "Model recommendation failed unexpectedly.",
        });
    }
}

/**
 * Public recommendation function. An empty array is a successful result, not an error.
 */
export async function recommendModels(
    requirements: AiTaskRequirements | unknown,
    candidates: readonly ModelCandidate[] | unknown,
    options: RecommendModelsOptions = {},
): Promise<Result<ModelRecommendation[], AiModuleError>> {
    const r = await recommendModelsWithDiagnostics(requirements, candidates, options);
    if (!r.ok) return r;
    return ok(r.data.recommendations);
}
