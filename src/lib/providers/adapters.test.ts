import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inferenceResponseSchema, type InferenceRequest } from "@/lib/contracts/inference";
import { GroqAdapter } from "./groq";
import { SimulatorAdapter } from "./simulator";
import { getProviderAdapter } from "./registry";

const syntheticRequest: InferenceRequest = {
    runId: "run_123e4567-e89b-42d3-a456-426614174000",
    attemptNumber: 1,
    modelId: "sim-basic-fast",
    provider: "simulator",
    providerModelId: "sim-basic-fast",
    mode: "simulated",
    input: {
        messages: [{ role: "user", content: "Explain quantum computing briefly" }],
        maxOutputTokens: 100,
        temperature: 0.7,
    },
    deadlineAt: "2026-10-11T12:00:30Z",
    timeoutMs: 5000,
};

describe("Module 4: Provider Adapters", () => {
    describe("SimulatorAdapter", () => {
        const simulator = new SimulatorAdapter();

        it("executes deterministically without credentials and conforms to schema", async () => {
            const result = await simulator.execute(syntheticRequest);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.response.mode).toBe("simulated");
                expect(result.response.output).toContain("[SIMULATED RESPONSE from sim-basic-fast");
                expect(result.response.usage?.source).toBe("estimated");
                expect(result.response.charge?.kind).toBe("estimated");
                const validation = inferenceResponseSchema.safeParse(result.response);
                expect(validation.success).toBe(true);
            }
        });

        it("simulates timeout when artificialLatencyMs exceeds timeoutMs", async () => {
            const result = await simulator.execute(syntheticRequest, { artificialLatencyMs: 6000 });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("timeout");
                expect(result.error.retryable).toBe(true);
                expect(result.error.httpStatus).toBe(504);
            }
        });

        it("simulates rate_limited fault (HTTP 429)", async () => {
            const result = await simulator.execute(syntheticRequest, { forceFault: "rate_limited" });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("rate_limited");
                expect(result.error.httpStatus).toBe(429);
                expect(result.error.retryable).toBe(true);
            }
        });

        it("simulates server_error fault (HTTP 500)", async () => {
            const result = await simulator.execute(syntheticRequest, { forceFault: "server_error" });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("server_error");
                expect(result.error.httpStatus).toBe(500);
            }
        });

        it("simulates unavailable fault (HTTP 503)", async () => {
            const result = await simulator.execute(syntheticRequest, { forceFault: "unavailable" });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("unavailable");
                expect(result.error.httpStatus).toBe(503);
            }
        });

        it("handles cancellation via AbortSignal", async () => {
            const controller = new AbortController();
            controller.abort();
            const result = await simulator.execute(syntheticRequest, { signal: controller.signal });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("cancelled");
                expect(result.error.retryable).toBe(false);
            }
        });
    });

    describe("GroqAdapter", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
            delete process.env.GROQ_API_KEY;
        });

        afterEach(() => {
            process.env = originalEnv;
            vi.restoreAllMocks();
        });

        it("reports isConfigured false when GROQ_API_KEY is not set", () => {
            const groq = new GroqAdapter();
            expect(groq.isConfigured()).toBe(false);
        });

        it("reports isConfigured true when GROQ_API_KEY is set", () => {
            process.env.GROQ_API_KEY = "gsk_test_api_key_valid_length_here";
            const groq = new GroqAdapter();
            expect(groq.isConfigured()).toBe(true);
        });

        it("delegates simulated mode requests to simulator even if unconfigured", async () => {
            const groq = new GroqAdapter();
            const result = await groq.execute(syntheticRequest);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.response.mode).toBe("simulated");
            }
        });

        it("returns unauthorized error when live execution requested without API key", async () => {
            const groq = new GroqAdapter();
            const liveReq = { ...syntheticRequest, mode: "live" as const };
            const result = await groq.execute(liveReq);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("unauthorized");
            }
        });

        it("successfully parses live response from mocked Groq API", async () => {
            process.env.GROQ_API_KEY = "gsk_test_mock_key_123456789";
            const groq = new GroqAdapter();

            const mockResponse = {
                id: "chatcmpl-123",
                choices: [
                    {
                        message: { role: "assistant", content: "Quantum computers utilize qubits." },
                        finish_reason: "stop",
                    },
                ],
                usage: {
                    prompt_tokens: 15,
                    completion_tokens: 8,
                },
            };

            vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                new Response(JSON.stringify(mockResponse), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            );

            const liveReq = { ...syntheticRequest, mode: "live" as const, provider: "groq", providerModelId: "llama-3.1-8b-instant" };
            const result = await groq.execute(liveReq);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.response.mode).toBe("live");
                expect(result.response.output).toBe("Quantum computers utilize qubits.");
                expect(result.response.usage?.inputTokens).toBe(15);
                expect(result.response.usage?.outputTokens).toBe(8);
                expect(result.response.usage?.source).toBe("provider_reported");
                const validation = inferenceResponseSchema.safeParse(result.response);
                expect(validation.success).toBe(true);
            }
        });

        it("normalizes HTTP 429 from Groq API into retryable rate_limited with retryAfter", async () => {
            process.env.GROQ_API_KEY = "gsk_test_mock_key_123456789";
            const groq = new GroqAdapter();

            vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
                    status: 429,
                    headers: { "retry-after": "2" },
                }),
            );

            const liveReq = { ...syntheticRequest, mode: "live" as const, provider: "groq" };
            const result = await groq.execute(liveReq);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe("rate_limited");
                expect(result.error.httpStatus).toBe(429);
                expect(result.error.retryable).toBe(true);
                expect(result.error.retryAfterMs).toBe(2000);
            }
        });
    });

    describe("Registry", () => {
        it("returns registered simulator adapter", () => {
            const adapter = getProviderAdapter("simulator");
            expect(adapter.providerId).toBe("simulator");
        });

        it("returns registered groq adapter", () => {
            const adapter = getProviderAdapter("groq");
            expect(adapter.providerId).toBe("groq");
        });

        it("falls back to simulator adapter for unknown provider", () => {
            const adapter = getProviderAdapter("unknown-provider-xyz");
            expect(adapter.providerId).toBe("simulator");
        });
    });
});
