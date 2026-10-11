import type {
    InferenceCallOptions,
    InferenceRequest,
    InferenceResponse,
} from "@/lib/contracts/inference";
import type {
    ProviderAdapter,
    ProviderExecutionResult,
    SimulationFaultOptions,
} from "./types";

export class SimulatorAdapter implements ProviderAdapter {
    readonly providerId = "simulator";

    isConfigured(): boolean {
        return true;
    }

    async execute(
        request: InferenceRequest,
        options: InferenceCallOptions & SimulationFaultOptions = {},
    ): Promise<ProviderExecutionResult> {
        const startTime = Date.now();

        if (options.signal?.aborted) {
            return {
                ok: false,
                latencyMs: 1,
                error: {
                    code: "cancelled",
                    retryable: false,
                    message: "Execution was cancelled by caller",
                },
            };
        }

        const artificialLatency = options.artificialLatencyMs ?? 20;

        // Check if artificial latency or timeout occurs
        if (artificialLatency > request.timeoutMs || options.forceFault === "timeout") {
            const actualLatency = Math.min(artificialLatency, request.timeoutMs);
            return {
                ok: false,
                latencyMs: actualLatency,
                error: {
                    code: "timeout",
                    retryable: true,
                    httpStatus: 504,
                    message: `Operation timed out after ${request.timeoutMs}ms (simulated)`,
                },
            };
        }

        if (options.forceFault === "rate_limited") {
            return {
                ok: false,
                latencyMs: artificialLatency,
                error: {
                    code: "rate_limited",
                    retryable: true,
                    httpStatus: 429,
                    retryAfterMs: 500,
                    message: "Rate limit exceeded (simulated HTTP 429)",
                },
            };
        }

        if (options.forceFault === "server_error") {
            return {
                ok: false,
                latencyMs: artificialLatency,
                error: {
                    code: "server_error",
                    retryable: true,
                    httpStatus: 500,
                    message: "Internal upstream server error (simulated HTTP 500)",
                },
            };
        }

        if (options.forceFault === "unavailable") {
            return {
                ok: false,
                latencyMs: artificialLatency,
                error: {
                    code: "unavailable",
                    retryable: true,
                    httpStatus: 503,
                    message: "Service unavailable (simulated HTTP 503)",
                },
            };
        }

        // Calculate prompt tokens
        const totalChars = request.input.messages.reduce(
            (acc, m) => acc + m.content.length,
            0,
        );
        const inputTokens = Math.max(1, Math.round(totalChars / 4));
        const outputTokens = Math.min(
            request.input.maxOutputTokens ?? 250,
            Math.max(20, Math.round(inputTokens * 0.5)),
        );

        const lastUserMessage = [...request.input.messages]
            .reverse()
            .find((m) => m.role === "user")?.content ?? "Hello";

        const outputText = `[SIMULATED RESPONSE from ${request.modelId} (${request.providerModelId})]: Processing complete for prompt "${lastUserMessage.slice(0, 80)}${lastUserMessage.length > 80 ? "..." : ""}". Response generated deterministically.`;

        const completedAt = new Date().toISOString();
        const latencyMs = Math.max(1, artificialLatency || (Date.now() - startTime));

        const estimatedCost = Number(
            ((inputTokens / 1_000_000) * 0.1 + (outputTokens / 1_000_000) * 0.2).toFixed(6),
        );

        const response: InferenceResponse = {
            runId: request.runId,
            modelId: request.modelId,
            provider: request.provider,
            mode: "simulated",
            output: outputText,
            finishReason: "stop",
            latencyMs,
            usage: {
                inputTokens,
                outputTokens,
                source: "estimated",
            },
            charge: {
                kind: "estimated",
                amountUsd: estimatedCost,
            },
            completedAt,
        };

        return {
            ok: true,
            response,
        };
    }
}
