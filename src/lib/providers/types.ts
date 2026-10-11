import type {
    InferenceCallOptions,
    InferenceRequest,
    InferenceResponse,
    ProviderError,
} from "@/lib/contracts/inference";

export type ProviderExecutionResult =
    | { ok: true; response: InferenceResponse }
    | { ok: false; error: ProviderError; latencyMs: number };

export interface SimulationFaultOptions {
    readonly forceFault?: "timeout" | "rate_limited" | "server_error" | "unavailable";
    readonly artificialLatencyMs?: number;
}

export interface ProviderAdapter {
    readonly providerId: string;
    isConfigured(): boolean;
    execute(
        request: InferenceRequest,
        options?: InferenceCallOptions & SimulationFaultOptions,
    ): Promise<ProviderExecutionResult>;
}
