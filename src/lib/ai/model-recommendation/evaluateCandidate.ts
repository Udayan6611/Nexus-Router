import type {
    AiTaskRequirements,
    AiTaskType,
    ModelCandidate,
    RecommendModelsOptions,
} from "@/lib/ai/contracts";
import type { QualityTier } from "@/lib/contracts/catalogue";

export type Fit = "supported" | "unsupported" | "unknown";
export type ContextFit = Fit | "not_assessed";

export const MODALITIES = ["text", "image", "audio", "video", "document"] as const;
export type Modality = (typeof MODALITIES)[number];

export const QUALITY_TIERS: readonly QualityTier[] = ["basic", "standard", "advanced", "frontier"] as const;

/** Sanitized view of a candidate. undefined always means unknown. */
export interface CandidateFacts {
    id: string;
    taskTypes?: AiTaskType[];
    modalities?: Modality[];
    contextWindowTokens?: number;
    inputPricePerMTok?: number;
    outputPricePerMTok?: number;
    blendedPricePerMTok?: number;
    medianLatencyMs?: number;
    qualityTier?: QualityTier;
    knownLimitations: string[];
}

export interface Evaluation {
    facts: CandidateFacts;
    taskFit: Fit;
    contextFit: ContextFit;
    /** Documented mismatches (known, not merely missing). */
    mismatches: string[];
    /** Number of metadata dimensions that are known (evidence completeness). */
    evidenceCount: number;
    recommendable: boolean;
    notRecommendedReason?: string;
}

const TASK_TYPE_LIST: readonly string[] = [
    "coding",
    "reasoning",
    "summarization",
    "document_analysis",
    "multimodal",
    "general",
];

const nonNeg = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;

const positive = (v: unknown): number | undefined => {
    const n = nonNeg(v);
    return n !== undefined && n > 0 ? n : undefined;
};

const list = <T extends string>(v: unknown, allowed: readonly string[]): T[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is T => typeof x === "string" && allowed.includes(x));
    return out.length > 0 ? Array.from(new Set(out)) : undefined;
};

export function readFacts(c: ModelCandidate): CandidateFacts {
    const inP = nonNeg(c.pricing?.inputPerMTokUsd);
    const outP = nonNeg(c.pricing?.outputPerMTokUsd);
    const tier =
        typeof c.qualityTier === "string" && (QUALITY_TIERS as readonly string[]).includes(c.qualityTier)
            ? c.qualityTier
            : undefined;

    return {
        id: c.id,
        taskTypes: list<AiTaskType>(c.supportedTaskTypes, TASK_TYPE_LIST),
        modalities: list<Modality>(c.inputModalities, MODALITIES),
        contextWindowTokens: positive(c.contextWindowTokens),
        inputPricePerMTok: inP,
        outputPricePerMTok: outP,
        blendedPricePerMTok: inP !== undefined && outP !== undefined ? inP + outP : undefined,
        medianLatencyMs: nonNeg(c.latency?.medianMs),
        qualityTier: tier,
        knownLimitations: Array.isArray(c.knownLimitations)
            ? c.knownLimitations
                .filter((l): l is string => typeof l === "string" && l.trim() !== "")
                .map((l) => l.trim())
            : [],
    };
}

function taskFitFor(taskType: AiTaskType, f: CandidateFacts): Fit {
    if (taskType === "multimodal") {
        const signals: boolean[] = [];
        if (f.taskTypes) signals.push(f.taskTypes.includes("multimodal"));
        if (f.modalities) signals.push(f.modalities.some((m) => m !== "text"));
        if (signals.length === 0) return "unknown";
        return signals.some(Boolean) ? "supported" : "unsupported";
    }
    if (taskType === "general") {
        return f.taskTypes?.includes("general") ? "supported" : "unknown";
    }
    if (!f.taskTypes) return "unknown";
    return f.taskTypes.includes(taskType) ? "supported" : "unsupported";
}

/**
 * Deterministic, evidence-based evaluation of candidates against task requirements.
 * Inferred requirements are never used to exclude candidates.
 */
export function evaluateCandidate(
    req: AiTaskRequirements,
    candidate: ModelCandidate,
    opts: RecommendModelsOptions = {},
): Evaluation {
    const facts = readFacts(candidate);
    const taskFit = taskFitFor(req.taskType, facts);
    const mismatches: string[] = [];
    if (taskFit === "unsupported") {
        mismatches.push(`Catalogue does not document support for ${req.taskType} tasks.`);
    }

    let contextFit: ContextFit = "not_assessed";
    const tokens = positive(opts.estimatedInputTokens);
    if (tokens !== undefined) {
        if (facts.contextWindowTokens === undefined) {
            contextFit = "unknown";
        } else if (tokens <= facts.contextWindowTokens) {
            contextFit = "supported";
        } else {
            contextFit = "unsupported";
            mismatches.push(
                `Documented context window (${facts.contextWindowTokens} tokens) is smaller than estimated input (${tokens} tokens).`,
            );
        }
    }

    const evidenceCount = [
        facts.taskTypes,
        facts.modalities,
        facts.contextWindowTokens,
        facts.blendedPricePerMTok,
        facts.medianLatencyMs,
        facts.qualityTier,
    ].filter((v) => v !== undefined).length;

    let recommendable = false;
    let notRecommendedReason: string | undefined;
    if (mismatches.length > 0) {
        notRecommendedReason = mismatches[0];
    } else if (taskFit === "supported") {
        recommendable = true;
    } else if (req.taskType === "general" && evidenceCount > 0) {
        recommendable = true;
    } else {
        notRecommendedReason = `Insufficient catalogue evidence that this model supports ${req.taskType} tasks.`;
    }

    return { facts, taskFit, contextFit, mismatches, evidenceCount, recommendable, notRecommendedReason };
}
