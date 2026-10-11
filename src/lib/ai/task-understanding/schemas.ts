import { z } from "zod";
import {
    AI_COMPLEXITIES,
    AI_OPTIMIZATIONS,
    AI_TASK_TYPES,
} from "@/lib/ai/contracts";

export const INPUT_SOURCES = ["typed", "document", "voice"] as const;

export const LIMITS = {
    constraintText: 300,
    evidence: 500,
    rationale: 500,
    summary: 400,
    listItems: 20,
} as const;

export const TaskUnderstandingInputSchema = z.object({
    prompt: z.string(),
    source: z.enum(INPUT_SOURCES),
    sessionId: z.string().optional(),
});

export const UncertaintySchema = z
    .object({
        /** 0 = fully clear request, 1 = almost nothing can be determined. */
        score: z.number().min(0).max(1),
        clarificationNeeded: z.boolean(),
        reasons: z.array(z.string().min(1).max(300)).max(10),
    })
    .refine((u) => !u.clarificationNeeded || u.reasons.length > 0, {
        message: "clarificationNeeded requires at least one reason",
    });

/** Stated by the user. evidence is a verbatim quote from the input. */
export const ExplicitConstraintSchema = z.object({
    provenance: z.literal("explicit"),
    text: z.string().min(1).max(LIMITS.constraintText),
    evidence: z.string().min(1).max(LIMITS.evidence),
});

/** Inferred by AI. Deliberately has NO 'hard' flag: inferences are strictly advisory. */
export const InferredRequirementSchema = z.object({
    provenance: z.literal("inferred"),
    text: z.string().min(1).max(LIMITS.constraintText),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1).max(LIMITS.rationale),
});

export const TaskRequirementsSchema = z.object({
    taskType: z.enum(AI_TASK_TYPES),
    complexity: z.enum(AI_COMPLEXITIES),
    optimization: z.enum(AI_OPTIMIZATIONS),
    explicitConstraints: z.array(ExplicitConstraintSchema).max(LIMITS.listItems),
    inferredRequirements: z.array(InferredRequirementSchema).max(LIMITS.listItems),
    uncertainty: UncertaintySchema,
    summary: z.string().min(1).max(LIMITS.summary),
});

/**
 * Raw shape returned by the LLM.
 * Unknown keys are stripped by Zod so an LLM cannot smuggle unwanted instructions or flags.
 */
export const AiTaskOutputSchema = z.object({
    taskType: z.enum(AI_TASK_TYPES),
    complexity: z.enum(AI_COMPLEXITIES),
    optimization: z.enum(AI_OPTIMIZATIONS),
    optimizationEvidence: z.string().nullish(),
    explicitConstraints: z.array(z.object({ text: z.string().min(1), evidence: z.string().min(1) })),
    inferredRequirements: z.array(
        z.object({
            text: z.string().min(1),
            confidence: z.number().min(0).max(1),
            rationale: z.string().min(1),
        }),
    ),
    uncertainty: UncertaintySchema,
    summary: z.string().min(1),
});

export type AiTaskOutput = z.infer<typeof AiTaskOutputSchema>;
