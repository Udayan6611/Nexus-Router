import { beforeEach, describe, expect, it } from "vitest";
import type { RunRecord } from "@/lib/contracts/runs";
import { runTraceSchema, usageSummarySchema } from "./types";
import {
    fetchRunById,
    fetchRunTrace,
    fetchUsageSummary,
    saveRunRecord,
} from "./runs-repository";
import { clearTrackedRuns } from "@/lib/orchestration/tracker";

const sampleRun: RunRecord = {
    runId: "run_123e4567-e89b-42d3-a456-426614174000",
    requestId: "req_123e4567-e89b-42d3-a456-426614174000",
    status: "succeeded",
    selectionMode: "automatic",
    mode: "simulated",
    createdAt: "2026-10-11T12:00:00Z",
    startedAt: "2026-10-11T12:00:01Z",
    completedAt: "2026-10-11T12:00:02Z",
    attempts: [
        {
            attemptNumber: 1,
            modelId: "llama-3.1-8b-instant",
            provider: "groq",
            mode: "simulated",
            role: "primary",
            status: "succeeded",
            startedAt: "2026-10-11T12:00:01Z",
            endedAt: "2026-10-11T12:00:02Z",
            latencyMs: 150,
            usage: {
                inputTokens: 100,
                outputTokens: 50,
                source: "estimated",
            },
            charge: {
                kind: "estimated",
                amountUsd: 0.00002,
            },
        },
    ],
    fallbackTrace: [],
};

describe("Module 6: Persistence, Telemetry & Usage", () => {
    beforeEach(() => {
        clearTrackedRuns();
    });

    it("saves run record and returns explicit in_memory_recent source when unconfigured", async () => {
        const result = await saveRunRecord(sampleRun);
        expect(result.persisted).toBe(false);
        expect(result.source).toBe("in_memory_recent");
    });

    it("fetches run by ID from in-memory tracker", async () => {
        await saveRunRecord(sampleRun);
        const fetched = await fetchRunById(sampleRun.runId);
        expect(fetched).toBeDefined();
        expect(fetched?.run.runId).toBe(sampleRun.runId);
        expect(fetched?.source).toBe("in_memory_recent");
    });

    it("returns undefined for non-existent run ID", async () => {
        const fetched = await fetchRunById("run_00000000-0000-4000-8000-000000000000");
        expect(fetched).toBeUndefined();
    });

    it("extracts schema-valid trace from run", async () => {
        await saveRunRecord(sampleRun);
        const trace = await fetchRunTrace(sampleRun.runId);
        expect(trace).toBeDefined();
        expect(trace?.runId).toBe(sampleRun.runId);
        expect(trace?.attempts.length).toBe(1);
        const validation = runTraceSchema.safeParse(trace);
        expect(validation.success).toBe(true);
    });

    it("computes usage summary across saved runs", async () => {
        await saveRunRecord(sampleRun);
        const summary = await fetchUsageSummary();
        expect(summary.totalRuns).toBe(1);
        expect(summary.successfulRuns).toBe(1);
        expect(summary.totalInputTokens).toBe(100);
        expect(summary.totalOutputTokens).toBe(50);
        expect(summary.totalEstimatedCostUsd).toBe(0.00002);
        expect(summary.storageSource).toBe("in_memory_recent");

        const validation = usageSummarySchema.safeParse(summary);
        expect(validation.success).toBe(true);
    });
});
