import type { AiTaskRequirements, TaskUnderstandingInput } from "@/lib/ai/contracts";
import { LIMITS, type AiTaskOutput } from "./schemas";

const DEMOTED_CONFIDENCE = 0.3;

export function matchKey(s: string): string {
    return s
        .normalize("NFC")
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

/** True only if evidence (>= 3 chars) is a verbatim substring of the input, ignoring case/spacing. */
export function evidenceInInput(evidence: string, prompt: string): boolean {
    const e = matchKey(evidence);
    return e.length >= 3 && matchKey(prompt).includes(e);
}

/** Tolerant JSON extraction: plain JSON, fenced JSON, or JSON surrounded by stray text. */
export function parseProviderJson(raw: string): unknown | undefined {
    const attempts: string[] = [raw.trim()];
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) attempts.push(fenced[1].trim());
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last > first) attempts.push(raw.slice(first, last + 1));
    for (const a of attempts) {
        try {
            return JSON.parse(a);
        } catch {
            /* try next attempt */
        }
    }
    return undefined;
}

/**
 * Turns validated AI output into AiTaskRequirements, enforcing provenance:
 *  - an "explicit" constraint survives only if its evidence is quoted from the user's input;
 *  - otherwise it is DEMOTED to a low-confidence inference (never the other way round);
 *  - for source "document", nothing is explicit (document text is not the user's own constraint);
 *  - an optimization preference without verifiable evidence becomes "unspecified".
 */
export function normalizeAiOutput(ai: AiTaskOutput, input: TaskUnderstandingInput): AiTaskRequirements {
    const fromDocument = input.source === "document";
    const explicit: AiTaskRequirements["explicitConstraints"] = [];
    const inferred: AiTaskRequirements["inferredRequirements"] = [];
    const explicitKeys = new Set<string>();
    const inferredKeys = new Set<string>();

    const pushInferred = (text: string, confidence: number, rationale: string) => {
        const key = matchKey(text);
        if (explicitKeys.has(key) || inferredKeys.has(key)) return;
        inferredKeys.add(key);
        inferred.push({
            provenance: "inferred",
            text,
            confidence,
            rationale: rationale.slice(0, LIMITS.rationale),
        });
    };

    for (const c of ai.explicitConstraints) {
        const text = c.text.trim().slice(0, LIMITS.constraintText);
        const evidence = c.evidence.trim().slice(0, LIMITS.evidence);
        if (!text) continue;
        const key = matchKey(text);
        if (explicitKeys.has(key)) continue;

        if (fromDocument) {
            pushInferred(text, DEMOTED_CONFIDENCE, "Found in document text, not stated by user; treated as inference.");
        } else if (!evidenceInInput(evidence, input.prompt)) {
            pushInferred(text, DEMOTED_CONFIDENCE, "Claimed as explicit but no verbatim evidence in prompt; demoted to inference.");
        } else {
            explicitKeys.add(key);
            explicit.push({ provenance: "explicit", text, evidence });
        }
    }

    for (const r of ai.inferredRequirements) {
        const text = r.text.trim().slice(0, LIMITS.constraintText);
        if (text) pushInferred(text, r.confidence, r.rationale.trim());
    }

    const optimizationVerified =
        ai.optimization === "unspecified" ||
        (!fromDocument && Boolean(ai.optimizationEvidence) && evidenceInInput(ai.optimizationEvidence!, input.prompt));

    return {
        taskType: ai.taskType,
        complexity: ai.complexity,
        optimization: optimizationVerified ? ai.optimization : "unspecified",
        explicitConstraints: explicit.slice(0, LIMITS.listItems),
        inferredRequirements: inferred.slice(0, LIMITS.listItems),
        uncertainty: {
            score: ai.uncertainty.score,
            clarificationNeeded: ai.uncertainty.clarificationNeeded,
            reasons: ai.uncertainty.reasons.map((r: string) => r.trim()).filter(Boolean),
        },
        summary: ai.summary.trim().slice(0, LIMITS.summary),
    };
}
