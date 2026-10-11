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
import { SimulatorAdapter } from "./simulator";

export class GroqAdapter implements ProviderAdapter {
    readonly providerId = "groq";
    private readonly simulator = new SimulatorAdapter();

    private getApiKey(): string | undefined {
        return process.env.GROQ_API_KEY?.trim();
    }

    isConfigured(): boolean {
        const key = this.getApiKey();
        return Boolean(key && key.length >= 10);
    }

    async execute(
        request: InferenceRequest,
        options: InferenceCallOptions & SimulationFaultOptions = {},
    ): Promise<ProviderExecutionResult> {
        // If request is simulated or simulator fault was forced, delegate to simulator
        if (request.mode === "simulated" || options.forceFault || options.artificialLatencyMs) {
            return this.simulator.execute(request, options);
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            return {
                ok: false,
                latencyMs: 1,
                error: {
                    code: "unauthorized",
                    retryable: false,
                    message: "Groq provider is not configured: GROQ_API_KEY is not set",
                },
            };
        }

        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs);

        const onCallerAbort = () => controller.abort();
        if (options.signal) {
            options.signal.addEventListener("abort", onCallerAbort, { once: true });
        }

        try {
            const body = {
                model: request.providerModelId,
                messages: request.input.messages,
                max_tokens: request.input.maxOutputTokens,
                temperature: request.input.temperature,
            };

            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const latencyMs = Math.max(1, Date.now() - startTime);

            if (!res.ok) {
                const status = res.status;
                let errorData: { error?: { message?: string } } = {};
                try {
                    errorData = await res.json();
                } catch {
                    // non-JSON error body
                }

                const rawMsg = errorData.error?.message ?? `Groq upstream HTTP ${status}`;
                const sanitizedMsg = rawMsg.replace(/gsk_[A-Za-z0-9]+/g, "[REDACTED_API_KEY]");

                if (status === 429) {
                    const retryHeader = res.headers.get("retry-after");
                    const retryAfterMs = retryHeader ? parseInt(retryHeader, 10) * 1000 : 1000;
                    return {
                        ok: false,
                        latencyMs,
                        error: {
                            code: "rate_limited",
                            retryable: true,
                            httpStatus: 429,
                            retryAfterMs: isNaN(retryAfterMs) ? 1000 : retryAfterMs,
                            message: sanitizedMsg,
                        },
                    };
                }

                if (status >= 500) {
                    return {
                        ok: false,
                        latencyMs,
                        error: {
                            code: status === 504 ? "timeout" : "server_error",
                            retryable: true,
                            httpStatus: status,
                            message: sanitizedMsg,
                        },
                    };
                }

                if (status === 401 || status === 403) {
                    return {
                        ok: false,
                        latencyMs,
                        error: {
                            code: "unauthorized",
                            retryable: false,
                            httpStatus: status,
                            message: "Groq API authentication failed",
                        },
                    };
                }

                return {
                    ok: false,
                    latencyMs,
                    error: {
                        code: "bad_request",
                        retryable: false,
                        httpStatus: status,
                        message: sanitizedMsg,
                    },
                };
            }

            const json = await res.json();
            const choice = json.choices?.[0];
            const output = choice?.message?.content ?? "";
            const finishReason = choice?.finish_reason === "stop" ? "stop"
                : choice?.finish_reason === "length" ? "length"
                : choice?.finish_reason === "content_filter" ? "content_filter"
                : "other";

            const inputTokens = json.usage?.prompt_tokens ?? 0;
            const outputTokens = json.usage?.completion_tokens ?? 0;

            const response: InferenceResponse = {
                runId: request.runId,
                modelId: request.modelId,
                provider: request.provider,
                mode: "live",
                output,
                finishReason,
                latencyMs,
                usage: {
                    inputTokens,
                    outputTokens,
                    source: "provider_reported",
                },
                completedAt: new Date().toISOString(),
            };

            return {
                ok: true,
                response,
            };
        } catch {
            clearTimeout(timeoutId);
            const latencyMs = Math.max(1, Date.now() - startTime);

            if (options.signal?.aborted) {
                return {
                    ok: false,
                    latencyMs,
                    error: {
                        code: "cancelled",
                        retryable: false,
                        message: "Request was cancelled",
                    },
                };
            }

            if (controller.signal.aborted) {
                return {
                    ok: false,
                    latencyMs,
                    error: {
                        code: "timeout",
                        retryable: true,
                        httpStatus: 504,
                        message: `Groq request timed out after ${request.timeoutMs}ms`,
                    },
                };
            }

            return {
                ok: false,
                latencyMs,
                error: {
                    code: "network_error",
                    retryable: true,
                    message: "Network error during Groq request execution",
                },
            };
        } finally {
            if (options.signal) {
                options.signal.removeEventListener("abort", onCallerAbort);
            }
        }
    }
}
