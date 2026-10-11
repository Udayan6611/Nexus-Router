import { beforeEach, describe, expect, it } from "vitest";
import { CANONICAL_MODELS } from "@/lib/catalogue/models";
import { listModels, getModelById, compareModels } from "@/lib/catalogue/repository";
import { routeTask } from "@/lib/router/engine";
import { orchestrateRun } from "@/lib/orchestration/orchestrator";
import { fetchRunById, fetchRunTrace, fetchUsageSummary } from "@/lib/persistence/runs-repository";
import { clearTrackedRuns, requestRunCancellation } from "@/lib/orchestration/tracker";
import { assertRateLimit, resetRateLimiter } from "@/lib/server/rate-limiter";
import { AppError, serializeError } from "@/lib/errors";

describe("Module 7: End-to-End Integration & Security", () => {
    beforeEach(() => {
        clearTrackedRuns();
        resetRateLimiter();
    });

    describe("Full lifecycle: catalogue -> route -> execute -> persist -> telemetry", () => {
        it("orchestrates a complete automatic routing and execution lifecycle", async () => {
            // 1. Discover models from catalogue
            const cataloguePage = await listModels({ sortBy: "pricing", sortOrder: "asc", limit: 5 });
            expect(cataloguePage.items.length).toBeGreaterThanOrEqual(1);

            // 2. Perform deterministic routing
            const routingDecision = routeTask(
                {
                    preference: "cost",
                    constraints: { maxLatencyMs: 500 },
                },
                cataloguePage.items,
            );
            expect(routingDecision.outcome).toBe("selected");

            // 3. Execute via orchestrator
            const run = await orchestrateRun({
                request: {
                    preference: "cost",
                    constraints: { maxLatencyMs: 500 },
                    input: {
                        messages: [{ role: "user", content: "Summarize this sentence." }],
                    },
                    mode: "simulated",
                },
                candidates: cataloguePage.items,
            });

            expect(run.status).toBe("succeeded");
            expect(run.attempts.length).toBe(1);
            expect(run.response).toBeDefined();

            // 4. Retrieve persisted run
            const fetched = await fetchRunById(run.runId);
            expect(fetched).toBeDefined();
            expect(fetched?.run.runId).toBe(run.runId);
            expect(fetched?.run.status).toBe("succeeded");

            // 5. Retrieve run execution trace
            const trace = await fetchRunTrace(run.runId);
            expect(trace).toBeDefined();
            expect(trace?.runId).toBe(run.runId);
            expect(trace?.attempts.length).toBe(1);

            // 6. Inspect telemetry / usage
            const usage = await fetchUsageSummary();
            expect(usage.totalRuns).toBeGreaterThanOrEqual(1);
            expect(usage.successfulRuns).toBeGreaterThanOrEqual(1);
            expect(usage.totalInputTokens).toBeGreaterThan(0);
        });

        it("handles failure with automatic constraint-preserving fallback", async () => {
            const run = await orchestrateRun({
                request: {
                    preference: "cost",
                    constraints: {},
                    input: {
                        messages: [{ role: "user", content: "Test fallback." }],
                    },
                    mode: "simulated",
                    simulate: { forceFault: "rate_limited" },
                },
                candidates: CANONICAL_MODELS,
            });

            // Primary attempt failed with rate_limited; fell back to next model
            expect(run.attempts.length).toBeGreaterThanOrEqual(1);
            expect(run.fallbackTrace.length).toBeGreaterThanOrEqual(1);

            const trace = await fetchRunTrace(run.runId);
            expect(trace?.fallbackTrace.length).toBeGreaterThanOrEqual(1);
        });

        it("handles cancellation gracefully", async () => {
            const run = await orchestrateRun({
                request: {
                    selectionMode: "selected",
                    modelId: "llama-3.1-8b-instant",
                    input: { messages: [{ role: "user", content: "Hi" }] },
                    mode: "simulated",
                },
                candidates: CANONICAL_MODELS,
            });

            const cancelResult = requestRunCancellation(run.runId);
            expect(cancelResult.cancelled).toBe(false);
            expect(cancelResult.status).toBe("not_cancellable");
        });
    });

    describe("Security and rate limiting", () => {
        it("enforces in-memory sliding window rate limits", () => {
            const ip = "192.168.1.100";
            // Allow 5 requests
            for (let i = 0; i < 5; i++) {
                expect(() => assertRateLimit(ip, { maxRequests: 5, windowMs: 60_000 })).not.toThrow();
            }

            // 6th request triggers rate_limited AppError (HTTP 429)
            expect(() => assertRateLimit(ip, { maxRequests: 5, windowMs: 60_000 })).toThrowError(
                expect.objectContaining({ code: "rate_limited", status: 429 }),
            );
        });

        it("never leaks secret credentials in serialized error envelopes", () => {
            const errorWithSecrets = new AppError("configuration_error", {
                message: "Internal configuration failure involving gsk_secret_key_123456789 and sup_secret_role_key_abcdef",
            });

            const { status, body } = serializeError(errorWithSecrets);
            expect(status).toBe(503);
            expect(body.ok).toBe(false);

            const json = JSON.stringify(body);
            expect(json).not.toContain("gsk_secret_key_123456789");
            expect(json).not.toContain("sup_secret_role_key_abcdef");
            expect(body.error.message).toBe("The service is not configured for this operation.");
        });

        it("lookup and compare endpoints reject invalid models cleanly", async () => {
            const nonExistent = await getModelById("does-not-exist");
            expect(nonExistent).toBeUndefined();

            await expect(compareModels(["does-not-exist-1", "does-not-exist-2"])).rejects.toThrowError(
                expect.objectContaining({ code: "not_found" }),
            );
        });
    });
});
