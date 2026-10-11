import type { AiTaskRequirements, TaskUnderstandingInput } from "@/lib/ai/contracts";
import { LIMITS, TaskRequirementsSchema } from "./schemas";

export type FallbackReason =
    | "provider_timeout"
    | "provider_network_error"
    | "provider_http_error"
    | "provider_not_configured"
    | "provider_empty_response"
    | "provider_unavailable"
    | "malformed_output"
    | "invalid_output"
    | "unexpected_error";

// Sentences containing clear, unambiguous obligation wording only
const OBLIGATION = /\b(must(?:n't| not)?|only use|do not use|don't use|never use)\b/i;

/**
 * Deterministic, conservative extraction of constraints the user stated in their own words.
 * Skipped for "document" input: document text is not the user's direct constraint.
 */
export function extractVerbatimConstraints(
    input: TaskUnderstandingInput,
): AiTaskRequirements["explicitConstraints"] {
    if (input.source === "document") return [];
    const seen = new Set<string>();
    const out: AiTaskRequirements["explicitConstraints"] = [];
    for (const sentence of input.prompt.split(/(?<=[.!?])\s+|\n+/)) {
        const s = sentence.trim();
        if (!s || !OBLIGATION.test(s)) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            provenance: "explicit",
            text: s.slice(0, LIMITS.constraintText),
            evidence: s.slice(0, LIMITS.evidence),
        });
        if (out.length >= 10) break;
    }
    return out;
}

const SAFE_DEFAULT: AiTaskRequirements = {
    taskType: "general",
    complexity: "unknown",
    optimization: "unspecified",
    explicitConstraints: [],
    inferredRequirements: [],
    uncertainty: {
        score: 0.9,
        clarificationNeeded: false,
        reasons: ["Automatic task understanding was unavailable; conservative defaults were used."],
    },
    summary: "Task could not be analyzed automatically.",
};

/** Never throws. Never selects a model. Never fabricates inferences. */
export function buildFallback(input: TaskUnderstandingInput, reason: FallbackReason): AiTaskRequirements {
    try {
        return TaskRequirementsSchema.parse({
            ...SAFE_DEFAULT,
            explicitConstraints: extractVerbatimConstraints(input),
            uncertainty: {
                score: 0.9,
                clarificationNeeded: false,
                reasons: [`Automatic task understanding failed (${reason}); conservative defaults were used.`],
            },
        }) as AiTaskRequirements;
    } catch {
        return SAFE_DEFAULT;
    }
}
