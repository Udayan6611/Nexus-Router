import { describe, expect, it } from "vitest";
import {
    executionAttemptSchema,
    fallbackStepSchema,
    isTerminalRunStatus,
    modelHealthObservationSchema,
    runRecordSchema,
    telemetryEventSchema,
    usageEventSchema,
} from "@/lib/contracts";
import {
    SYNTHETIC_REQUEST_ID,
    SYNTHETIC_RUN_ID,
    SYNTHETIC_TS,
    accepts,
    clone,
    syntheticAttemptFailed,
    syntheticAttemptInProgress,
    syntheticAttemptSkipped,
    syntheticAttemptSucceeded,
    syntheticInferenceResponse,
    syntheticNoEligibleDecision,
    syntheticRunExecuting,
} from "@/lib/contracts/__fixtures__/synthetic";

describe("executionAttemptSchema", () => {
    it("accepts succeeded, failed, in-progress and skipped attempts", () => {
        for (const attempt of [
            syntheticAttemptSucceeded,
            syntheticAttemptFailed,
            syntheticAttemptInProgress,
            syntheticAttemptSkipped,
        ]) {
            expect(accepts(executionAttemptSchema, attempt)).toBe(true);
        }
    });

    it("requires status-consistent fields", () => {
        const failedNoError = clone(syntheticAttemptFailed) as Record<string, unknown>;
        delete failedNoError.error;
        expect(accepts(executionAttemptSchema, failedNoError)).toBe(false);
        expect(
            accepts(executionAttemptSchema, { ...syntheticAttemptSucceeded, error: syntheticAttemptFailed.error }),
        ).toBe(false);
        const skippedNoReason = clone(syntheticAttemptSkipped) as Record<string, unknown>;
        delete skippedNoReason.skipReason;
        expect(accepts(executionAttemptSchema, skippedNoReason)).toBe(false);
        expect(
            accepts(executionAttemptSchema, { ...syntheticAttemptSucceeded, skipReason: syntheticAttemptSkipped.skipReason }),
        ).toBe(false);
    });

    it("rejects bad timestamps and an unknown status", () => {
        expect(accepts(executionAttemptSchema, { ...syntheticAttemptInProgress, endedAt: SYNTHETIC_TS })).toBe(false);
        expect(
            accepts(executionAttemptSchema, {
                ...syntheticAttemptSucceeded,
                startedAt: "2026-10-11T10:00:05Z",
                endedAt: "2026-10-11T10:00:01Z",
            }),
        ).toBe(false);
        expect(accepts(executionAttemptSchema, { ...syntheticAttemptSucceeded, status: "exploded" })).toBe(false);
    });

    it("labels simulated attempts and bounds the attempt number", () => {
        const { mode: _mode, ...withoutMode } = syntheticAttemptSucceeded;
        expect(accepts(executionAttemptSchema, withoutMode)).toBe(false);
        expect(accepts(executionAttemptSchema, { ...syntheticAttemptSucceeded, attemptNumber: 0 })).toBe(false);
        expect(accepts(executionAttemptSchema, { ...syntheticAttemptSucceeded, attemptNumber: 21 })).toBe(false);
    });
});

describe("fallbackStepSchema (discriminated on outcome)", () => {
    const base = { fromAttemptNumber: 1, trigger: "timeout", at: SYNTHETIC_TS };
    const reason = { code: "model_unavailable", message: "Synthetic" };

    it("accepts a fallback and a no-eligible-fallback outcome", () => {
        expect(
            accepts(fallbackStepSchema, { ...base, outcome: "fell_back", toAttemptNumber: 2, toModelId: "test-model-b" }),
        ).toBe(true);
        expect(accepts(fallbackStepSchema, { ...base, outcome: "no_eligible_fallback", reasons: [reason] })).toBe(true);
    });

    it("requires each outcome's own fields", () => {
        expect(accepts(fallbackStepSchema, { ...base, outcome: "fell_back" })).toBe(false);
        expect(accepts(fallbackStepSchema, { ...base, outcome: "no_eligible_fallback" })).toBe(false);
        expect(
            accepts(fallbackStepSchema, {
                ...base,
                outcome: "fell_back",
                toAttemptNumber: 2,
                toModelId: "test-model-b",
                reasons: [],
            }),
        ).toBe(false);
        expect(accepts(fallbackStepSchema, { ...base, trigger: "boredom", outcome: "no_eligible_fallback", reasons: [] })).toBe(false);
    });
});

describe("runRecordSchema", () => {
    const succeeded = {
        ...syntheticRunExecuting,
        status: "succeeded",
        completedAt: "2026-10-11T10:00:01Z",
        attempts: [syntheticAttemptSucceeded],
        response: syntheticInferenceResponse,
    };

    it("accepts a non-terminal run and a succeeded run", () => {
        expect(accepts(runRecordSchema, syntheticRunExecuting)).toBe(true);
        expect(accepts(runRecordSchema, succeeded)).toBe(true);
    });

    it("accepts a no_eligible_model run only with a matching decision", () => {
        const run = {
            ...syntheticRunExecuting,
            status: "no_eligible_model",
            completedAt: SYNTHETIC_TS,
            decision: syntheticNoEligibleDecision,
            attempts: [],
        };
        expect(accepts(runRecordSchema, run)).toBe(true);
        expect(accepts(runRecordSchema, { ...run, decision: syntheticRunExecuting.decision })).toBe(false);
        const withoutDecision = clone(run) as Record<string, unknown>;
        delete withoutDecision.decision;
        expect(accepts(runRecordSchema, withoutDecision)).toBe(false);
    });

    it("requires completedAt exactly when the status is terminal", () => {
        expect(accepts(runRecordSchema, { ...succeeded, completedAt: undefined })).toBe(false);
        expect(accepts(runRecordSchema, { ...syntheticRunExecuting, completedAt: SYNTHETIC_TS })).toBe(false);
    });

    it("requires failure information for a failed run", () => {
        const failed = { ...succeeded, status: "failed", response: undefined, attempts: [syntheticAttemptFailed] };
        expect(accepts(runRecordSchema, failed)).toBe(false);
        expect(
            accepts(runRecordSchema, { ...failed, failure: { code: "provider_error", message: "The upstream model provider failed." } }),
        ).toBe(true);
        expect(accepts(runRecordSchema, { ...failed, failure: { code: "made_up", message: "x" } })).toBe(false);
    });

    it("rejects bad IDs and too many attempts", () => {
        expect(accepts(runRecordSchema, { ...syntheticRunExecuting, runId: "run_nope" })).toBe(false);
        expect(accepts(runRecordSchema, { ...syntheticRunExecuting, requestId: "req_nope" })).toBe(false);
        const manyAttempts = Array.from({ length: 21 }, (_, i) => ({ ...syntheticAttemptInProgress, attemptNumber: (i % 20) + 1 }));
        expect(accepts(runRecordSchema, { ...syntheticRunExecuting, attempts: manyAttempts })).toBe(false);
    });

    it("classifies terminal statuses", () => {
        expect(isTerminalRunStatus("succeeded")).toBe(true);
        expect(isTerminalRunStatus("no_eligible_model")).toBe(true);
        expect(isTerminalRunStatus("executing")).toBe(false);
        expect(isTerminalRunStatus("queued")).toBe(false);
    });
});

describe("telemetryEventSchema (discriminated on type)", () => {
    const base = { runId: SYNTHETIC_RUN_ID, requestId: SYNTHETIC_REQUEST_ID, at: SYNTHETIC_TS, mode: "simulated" };
    const events = [
        { ...base, type: "route_decided", outcome: "selected", selectedModelId: "test-model-a", consideredCount: 3, rejectedCount: 1 },
        { ...base, type: "attempt_started", attemptNumber: 1, modelId: "test-model-a", provider: "test-provider", role: "primary" },
        { ...base, type: "attempt_finished", attemptNumber: 1, status: "failed", errorCode: "timeout", latencyMs: 500 },
        { ...base, type: "fallback_triggered", fromAttemptNumber: 1, toAttemptNumber: 2, trigger: "timeout", outcome: "fell_back" },
        { ...base, type: "cancel_requested" },
        { ...base, type: "run_finished", status: "cancelled" },
    ];

    it.each(events)("accepts $type", (event) => {
        expect(accepts(telemetryEventSchema, event)).toBe(true);
    });

    it("rejects an unknown type, a missing mode and non-terminal run_finished", () => {
        expect(accepts(telemetryEventSchema, { ...base, type: "mystery" })).toBe(false);
        const { mode: _mode, ...withoutMode } = events[4];
        expect(accepts(telemetryEventSchema, withoutMode)).toBe(false);
        expect(accepts(telemetryEventSchema, { ...base, type: "run_finished", status: "executing" })).toBe(false);
    });

    it("cannot carry prompts or outputs", () => {
        expect(accepts(telemetryEventSchema, { ...events[4], prompt: "secret prompt" })).toBe(false);
        expect(accepts(telemetryEventSchema, { ...events[2], output: "text" })).toBe(false);
    });
});

describe("usage events and health observations", () => {
    it("keeps reported and estimated charges distinct and labels the mode", () => {
        const usage = {
            runId: SYNTHETIC_RUN_ID,
            modelId: "test-model-a",
            provider: "test-provider",
            mode: "simulated",
            at: SYNTHETIC_TS,
            usage: { inputTokens: 1, outputTokens: 2, source: "provider_reported" },
            charge: { kind: "provider_reported", amountUsd: 0.002 },
        };
        expect(accepts(usageEventSchema, usage)).toBe(true);
        expect(accepts(usageEventSchema, { ...usage, charge: { kind: "mystery", amountUsd: 1 } })).toBe(false);
        const { mode: _mode, ...withoutMode } = usage;
        expect(accepts(usageEventSchema, withoutMode)).toBe(false);
    });

    it("labels simulated health observations", () => {
        const observation = {
            modelId: "test-model-a",
            provider: "test-provider",
            mode: "simulated",
            outcome: "rate_limited",
            observedAt: SYNTHETIC_TS,
        };
        expect(accepts(modelHealthObservationSchema, observation)).toBe(true);
        expect(accepts(modelHealthObservationSchema, { ...observation, mode: undefined })).toBe(false);
        expect(accepts(modelHealthObservationSchema, { ...observation, outcome: "great" })).toBe(false);
    });
});