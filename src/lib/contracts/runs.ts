import { z } from "zod";
import { ERROR_CODES } from "@/lib/errors";
import {
    costRecordSchema,
    inferenceResponseSchema,
    providerErrorCodeSchema,
    providerErrorSchema,
    tokenUsageSchema,
} from "@/lib/contracts/inference";
import {
    executionModeSchema,
    isoTimestampSchema,
    latencyMsSchema,
    modelIdSchema,
    modelRefShape,
    providerIdSchema,
    requestIdSchema,
    runIdSchema,
} from "@/lib/contracts/primitives";
import { rejectionReasonSchema, routingDecisionSchema } from "@/lib/contracts/routing";

export const TERMINAL_RUN_STATUSES = [
    "succeeded",
    "failed",
    "cancelled",
    "no_eligible_model",
] as const;
export const RUN_STATUSES = ["queued", "routing", "executing", ...TERMINAL_RUN_STATUSES] as const;
export const runStatusSchema = z.enum(RUN_STATUSES);
export type RunStatus = z.infer<typeof runStatusSchema>;

export function isTerminalRunStatus(status: RunStatus): boolean {
    return (TERMINAL_RUN_STATUSES as readonly string[]).includes(status);
}

export const ATTEMPT_STATUSES = [
    "in_progress",
    "succeeded",
    "failed",
    "cancelled",
    "skipped",
] as const;
export const attemptStatusSchema = z.enum(ATTEMPT_STATUSES);
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;

export const executionAttemptSchema = z
    .strictObject({
        attemptNumber: z.int().min(1).max(20),
        ...modelRefShape,
        mode: executionModeSchema,
        role: z.enum(["primary", "fallback"]),
        status: attemptStatusSchema,
        startedAt: isoTimestampSchema.optional(),
        endedAt: isoTimestampSchema.optional(),
        latencyMs: latencyMsSchema.optional(),
        usage: tokenUsageSchema.optional(),
        charge: costRecordSchema.optional(),
        error: providerErrorSchema.optional(),
        /** Why a fallback was not attempted (for example insufficient_deadline). */
        skipReason: rejectionReasonSchema.optional(),
    })
    .superRefine((attempt, ctx) => {
        if (attempt.status === "failed" && !attempt.error) {
            ctx.addIssue({ code: "custom", message: "A failed attempt must include an error", path: ["error"] });
        }
        if (attempt.status === "succeeded" && attempt.error) {
            ctx.addIssue({ code: "custom", message: "A succeeded attempt must not include an error", path: ["error"] });
        }
        if (attempt.status === "skipped" && !attempt.skipReason) {
            ctx.addIssue({ code: "custom", message: "A skipped attempt must include a skipReason", path: ["skipReason"] });
        }
        if (attempt.status !== "skipped" && attempt.skipReason) {
            ctx.addIssue({ code: "custom", message: "Only a skipped attempt may include a skipReason", path: ["skipReason"] });
        }
        if (attempt.status === "in_progress" && attempt.endedAt) {
            ctx.addIssue({ code: "custom", message: "An in-progress attempt must not have endedAt", path: ["endedAt"] });
        }
        if (
            attempt.startedAt &&
            attempt.endedAt &&
            Date.parse(attempt.endedAt) < Date.parse(attempt.startedAt)
        ) {
            ctx.addIssue({ code: "custom", message: "endedAt must not precede startedAt", path: ["endedAt"] });
        }
    });
export type ExecutionAttempt = z.infer<typeof executionAttemptSchema>;

export const FALLBACK_TRIGGERS = ["provider_error", "timeout", "deadline_risk"] as const;
export const fallbackTriggerSchema = z.enum(FALLBACK_TRIGGERS);

const fallbackStepBase = {
    fromAttemptNumber: z.int().min(1).max(20),
    trigger: fallbackTriggerSchema,
    at: isoTimestampSchema,
};

/** One entry per fallback decision. A failed primary may end in no_eligible_fallback, never an ineligible pick. */
export const fallbackStepSchema = z.discriminatedUnion("outcome", [
    z.strictObject({
        ...fallbackStepBase,
        outcome: z.literal("fell_back"),
        toAttemptNumber: z.int().min(2).max(20),
        toModelId: modelIdSchema,
    }),
    z.strictObject({
        ...fallbackStepBase,
        outcome: z.literal("no_eligible_fallback"),
        reasons: z.array(rejectionReasonSchema).max(20),
    }),
]);
export type FallbackStep = z.infer<typeof fallbackStepSchema>;

export const runFailureSchema = z.strictObject({
    code: z.enum(ERROR_CODES),
    /** Safe, client-facing message only. */
    message: z.string().min(1).max(300),
});
export type RunFailure = z.infer<typeof runFailureSchema>;

export const runRecordSchema = z
    .strictObject({
        runId: runIdSchema,
        requestId: requestIdSchema.optional(),
        status: runStatusSchema,
        selectionMode: z.enum(["automatic", "selected"]),
        mode: executionModeSchema,
        createdAt: isoTimestampSchema,
        startedAt: isoTimestampSchema.optional(),
        completedAt: isoTimestampSchema.optional(),
        /** Best-effort: records the request, not a guarantee that execution stopped. */
        cancelRequestedAt: isoTimestampSchema.optional(),
        decision: routingDecisionSchema.optional(),
        attempts: z.array(executionAttemptSchema).max(20),
        fallbackTrace: z.array(fallbackStepSchema).max(20),
        response: inferenceResponseSchema.optional(),
        failure: runFailureSchema.optional(),
    })
    .superRefine((run, ctx) => {
        const terminal = isTerminalRunStatus(run.status);
        if (terminal && !run.completedAt) {
            ctx.addIssue({ code: "custom", message: "A terminal run must have completedAt", path: ["completedAt"] });
        }
        if (!terminal && run.completedAt) {
            ctx.addIssue({ code: "custom", message: "A non-terminal run must not have completedAt", path: ["completedAt"] });
        }
        if (run.status === "failed" && !run.failure) {
            ctx.addIssue({ code: "custom", message: "A failed run must include failure information", path: ["failure"] });
        }
        if (run.status === "no_eligible_model" && run.decision?.outcome !== "no_eligible_model") {
            ctx.addIssue({
                code: "custom",
                message: "A no_eligible_model run must carry a no_eligible_model decision",
                path: ["decision"],
            });
        }
    });
export type RunRecord = z.infer<typeof runRecordSchema>;

// Telemetry and usage event shapes (storage comes in Module 6)
const eventBase = {
    runId: runIdSchema,
    requestId: requestIdSchema.optional(),
    at: isoTimestampSchema,
    mode: executionModeSchema,
};

/** Events carry identifiers and metrics only. Strict, so prompts or outputs cannot ride along. */
export const telemetryEventSchema = z.discriminatedUnion("type", [
    z.strictObject({
        type: z.literal("route_decided"),
        ...eventBase,
        outcome: z.enum(["selected", "no_eligible_model"]),
        selectedModelId: modelIdSchema.optional(),
        consideredCount: z.int().min(0).max(100_000),
        rejectedCount: z.int().min(0).max(100_000),
    }),
    z.strictObject({
        type: z.literal("attempt_started"),
        ...eventBase,
        attemptNumber: z.int().min(1).max(20),
        ...modelRefShape,
        role: z.enum(["primary", "fallback"]),
    }),
    z.strictObject({
        type: z.literal("attempt_finished"),
        ...eventBase,
        attemptNumber: z.int().min(1).max(20),
        status: attemptStatusSchema,
        latencyMs: latencyMsSchema.optional(),
        errorCode: providerErrorCodeSchema.optional(),
        usage: tokenUsageSchema.optional(),
        charge: costRecordSchema.optional(),
    }),
    z.strictObject({
        type: z.literal("fallback_triggered"),
        ...eventBase,
        fromAttemptNumber: z.int().min(1).max(20),
        toAttemptNumber: z.int().min(2).max(20).optional(),
        trigger: fallbackTriggerSchema,
        outcome: z.enum(["fell_back", "no_eligible_fallback"]),
    }),
    z.strictObject({ type: z.literal("cancel_requested"), ...eventBase }),
    z.strictObject({
        type: z.literal("run_finished"),
        ...eventBase,
        status: z.enum(TERMINAL_RUN_STATUSES),
    }),
]);
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

export const usageEventSchema = z.strictObject({
    runId: runIdSchema,
    ...modelRefShape,
    mode: executionModeSchema,
    at: isoTimestampSchema,
    latencyMs: latencyMsSchema.optional(),
    usage: tokenUsageSchema.optional(),
    charge: costRecordSchema.optional(),
});
export type UsageEvent = z.infer<typeof usageEventSchema>;

/** Simulated observations are labelled by `mode` so they cannot pass as live health data. */
export const modelHealthObservationSchema = z.strictObject({
    modelId: modelIdSchema,
    provider: providerIdSchema,
    mode: executionModeSchema,
    outcome: z.enum(["success", "failure", "timeout", "rate_limited"]),
    latencyMs: latencyMsSchema.optional(),
    observedAt: isoTimestampSchema,
});
export type ModelHealthObservation = z.infer<typeof modelHealthObservationSchema>;