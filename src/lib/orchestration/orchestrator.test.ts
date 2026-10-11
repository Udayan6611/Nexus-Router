import { beforeEach, describe, expect, it } from "vitest";
import { runRecordSchema } from "@/lib/contracts/runs";
import { CANONICAL_MODELS } from "@/lib/catalogue/models";
import { orchestrateRun } from "./orchestrator";
import { clearTrackedRuns, requestRunCancellation } from "./tracker";

const sampleInput = {
    messages: [{ role: "user" as const, content: "Hello, world!" }],
    maxOutputTokens: 50,
};

describe("Module 5: Execution, Fallback & Cancellation", () => {
    beforeEach(() => {
        clearTrackedRuns();
    });

    it("executes selected model successfully and produces schema-valid RunRecord", async () => {
        const run = await orchestrateRun({
            request: {
                selectionMode: "selected",
                modelId: "llama-3.1-8b-instant",
                input: sampleInput,
                mode: "simulated",
            },
            candidates: CANONICAL_MODELS,
        });

        expect(run.status).toBe("succeeded");
        expect(run.attempts.length).toBe(1);
        expect(run.attempts[0].modelId).toBe("llama-3.1-8b-instant");
        expect(run.attempts[0].status).toBe("succeeded");
        expect(run.response).toBeDefined();

        const validation = runRecordSchema.safeParse(run);
        expect(validation.success).toBe(true);
    });

    it("executes automatic routing run successfully", async () => {
        const run = await orchestrateRun({
            request: {
                preference: "cost",
                constraints: {},
                input: sampleInput,
                mode: "simulated",
            },
            candidates: CANONICAL_MODELS,
        });

        expect(run.status).toBe("succeeded");
        expect(run.selectionMode).toBe("automatic");
        expect(run.decision).toBeDefined();
        expect(run.attempts.length).toBe(1);

        const validation = runRecordSchema.safeParse(run);
        expect(validation.success).toBe(true);
    });

    it("triggers constraint-preserving fallback when primary attempt fails", async () => {
        const run = await orchestrateRun({
            request: {
                preference: "cost",
                constraints: {},
                input: sampleInput,
                mode: "simulated",
                simulate: { forceFault: "server_error" },
            },
            candidates: CANONICAL_MODELS,
        });

        // First attempt fails due to simulated server_error; fallback is attempted
        expect(run.attempts.length).toBeGreaterThanOrEqual(1);
        expect(run.attempts[0].status).toBe("failed");
        expect(run.fallbackTrace.length).toBeGreaterThan(0);

        const validation = runRecordSchema.safeParse(run);
        expect(validation.success).toBe(true);
    });

    it("terminates with no_eligible_model run status when no candidate qualifies", async () => {
        const run = await orchestrateRun({
            request: {
                preference: "cost",
                constraints: { maxCostUsd: 0.00000001 },
                input: sampleInput,
                mode: "simulated",
            },
            candidates: CANONICAL_MODELS,
        });

        expect(run.status).toBe("no_eligible_model");
        expect(run.decision?.outcome).toBe("no_eligible_model");
        expect(run.attempts.length).toBe(0);

        const validation = runRecordSchema.safeParse(run);
        expect(validation.success).toBe(true);
    });

    it("supports best-effort cancellation", () => {
        const cancelResult = requestRunCancellation("run_non_existent");
        expect(cancelResult.cancelled).toBe(false);
        expect(cancelResult.status).toBe("not_cancellable");
    });
});
