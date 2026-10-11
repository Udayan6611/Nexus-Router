import { buildFallback, type FallbackReason } from "./fallback";
import { loadTaskUnderstandingConfig, type TaskUnderstandingConfig } from "./config";
import {
    err,
    ok,
    type AiTaskRequirements,
    type Result,
    type TaskUnderstandingInput,
} from "@/lib/ai/contracts";
import { normalizeAiOutput, parseProviderJson } from "./normalize";
import { preprocessInput } from "./preprocess";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { ProviderError, createGroqProvider, type TaskProvider } from "./provider";
import { AiTaskOutputSchema, TaskRequirementsSchema } from "./schemas";

export interface UnderstandTaskDeps {
    /** Inject a mock provider in tests. Defaults to Groq provider. */
    provider?: TaskProvider;
    config?: Partial<TaskUnderstandingConfig>;
}

const reasonFor = (e: unknown): FallbackReason => {
    if (!(e instanceof ProviderError)) return "provider_unavailable";
    switch (e.kind) {
        case "timeout":
            return "provider_timeout";
        case "network":
            return "provider_network_error";
        case "http":
            return "provider_http_error";
        case "not_configured":
            return "provider_not_configured";
        case "empty_response":
            return "provider_empty_response";
    }
};

/**
 * Interprets a user request and describes its requirements as structured metadata.
 * Never selects a model, never promotes an inference to a hard constraint, never throws,
 * and never logs or exposes prompt content or credentials.
 */
export async function understandTask(
    input: TaskUnderstandingInput | unknown,
    deps: UnderstandTaskDeps = {},
): Promise<Result<AiTaskRequirements>> {
    try {
        const config: TaskUnderstandingConfig = { ...loadTaskUnderstandingConfig(), ...deps.config };

        const pre = preprocessInput(input, config);
        if (!pre.ok) return pre;
        const clean = pre.data;

        try {
            const provider =
                deps.provider ?? createGroqProvider({ apiKey: config.apiKey, model: config.model });

            let raw: string;
            try {
                raw = await provider({
                    system: SYSTEM_PROMPT,
                    user: buildUserMessage(clean),
                    timeoutMs: config.timeoutMs,
                });
            } catch (e) {
                return ok(buildFallback(clean, reasonFor(e)));
            }

            const json = typeof raw === "string" ? parseProviderJson(raw) : undefined;
            if (json === undefined) return ok(buildFallback(clean, "malformed_output"));

            const parsed = AiTaskOutputSchema.safeParse(json);
            if (!parsed.success) return ok(buildFallback(clean, "invalid_output"));

            const normalized = normalizeAiOutput(parsed.data, clean);
            const final = TaskRequirementsSchema.safeParse(normalized);
            if (!final.success) return ok(buildFallback(clean, "invalid_output"));

            return ok(final.data as AiTaskRequirements);
        } catch {
            return ok(buildFallback(clean, "unexpected_error"));
        }
    } catch {
        return err({
            code: "INTERNAL_ERROR",
            message: "Task understanding failed unexpectedly.",
        });
    }
}
