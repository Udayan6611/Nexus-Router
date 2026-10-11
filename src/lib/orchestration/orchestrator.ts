import { generateRunId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import type { ModelMetadata } from "@/lib/contracts/catalogue";
import type {
    ExecutionAttempt,
    FallbackStep,
    RunRecord,
} from "@/lib/contracts/runs";
import type { InferenceRequest, InferenceResponse, ProviderError } from "@/lib/contracts/inference";
import { getAllCatalogueModels } from "@/lib/catalogue/repository";
import { routeTask, validateFallback } from "@/lib/router/engine";
import { getProviderAdapter } from "@/lib/providers/registry";
import { registerActiveRun } from "./tracker";
import { saveRunRecord } from "@/lib/persistence/runs-repository";
import type { z } from "zod";
import type { playgroundRunRequestSchema, routeExecutionRequestSchema } from "./schemas";

export interface OrchestrationOptions {
    readonly request:
        | z.input<typeof routeExecutionRequestSchema>
        | z.input<typeof playgroundRunRequestSchema>;
    readonly requestId?: string;
    readonly candidates?: readonly ModelMetadata[];
}

export async function orchestrateRun(options: OrchestrationOptions): Promise<RunRecord> {
    const { request, requestId } = options;
    const runId = generateRunId();
    const createdAt = new Date().toISOString();
    const timeoutMs = request.timeoutMs ?? 30_000;
    const deadlineTimestamp = Date.now() + timeoutMs;
    const deadlineAt = new Date(deadlineTimestamp).toISOString();

    const controller = new AbortController();
    registerActiveRun(runId, controller);

    const candidates = options.candidates ?? (await getAllCatalogueModels()).models;
    const isPlaygroundSelected = "selectionMode" in request && request.selectionMode === "selected";
    const selectionMode: "automatic" | "selected" = isPlaygroundSelected ? "selected" : "automatic";
    const mode = request.mode ?? "simulated";

    const attempts: ExecutionAttempt[] = [];
    const fallbackTrace: FallbackStep[] = [];

    let primaryModel: ModelMetadata | undefined;
    let fallbackCandidates: readonly { modelId: string; rank: number }[] = [];

    let routingDecision: RunRecord["decision"];

    if (isPlaygroundSelected) {
        const selectedId = request.modelId!;
        primaryModel = candidates.find((m) => m.id === selectedId);
        if (!primaryModel) {
            throw new AppError("not_found", {
                message: `Selected model '${selectedId}' not found in catalogue`,
            });
        }
        // Other candidates can serve as potential fallback candidates
        fallbackCandidates = candidates
            .filter((m) => m.id !== selectedId)
            .map((m, idx) => ({ modelId: m.id, rank: idx + 2 }));
    } else {
        const decision = routeTask(
            {
                preference: request.preference ?? "cost",
                constraints: request.constraints ?? {},
                taskType: request.taskType,
            },
            candidates,
            createdAt,
        );
        routingDecision = decision;

        if (decision.outcome === "no_eligible_model") {
            const completedRun: RunRecord = {
                runId,
                ...(requestId ? { requestId } : {}),
                status: "no_eligible_model",
                selectionMode: "automatic",
                mode,
                createdAt,
                completedAt: new Date().toISOString(),
                decision,
                attempts: [],
                fallbackTrace: [],
            };
            await saveRunRecord(completedRun);
            return completedRun;
        }

        primaryModel = candidates.find((m) => m.id === decision.selected.modelId);
        fallbackCandidates = decision.fallbacks;
    }

    if (!primaryModel) {
        throw new AppError("internal_error", {
            message: "Failed to resolve primary model metadata",
        });
    }

    let currentModel: ModelMetadata = primaryModel;
    let attemptNumber = 1;
    let lastError: ProviderError | undefined;
    let finalResponse: InferenceResponse | undefined;
    let runStatus: RunRecord["status"] = "executing";

    const modelsAttempted = new Set<string>();

    while (attemptNumber <= 10) {
        modelsAttempted.add(currentModel.id);
        const isPrimary = attemptNumber === 1;
        const role = isPrimary ? "primary" : "fallback";

        const nowMs = Date.now();
        const remainingDeadlineMs = Math.max(0, deadlineTimestamp - nowMs);

        if (remainingDeadlineMs <= 10) {
            lastError = {
                code: "timeout",
                retryable: false,
                httpStatus: 504,
                message: "Deadline exceeded before attempt execution",
            };
            break;
        }

        const inferenceRequest: InferenceRequest = {
            runId,
            attemptNumber,
            modelId: currentModel.id,
            provider: currentModel.provider,
            providerModelId: currentModel.providerModelId,
            mode,
            input: request.input,
            deadlineAt,
            timeoutMs: Math.min(timeoutMs, remainingDeadlineMs),
        };

        const startedAt = new Date().toISOString();
        const adapter = getProviderAdapter(currentModel.provider);

        const executionResult = await adapter.execute(inferenceRequest, {
            signal: controller.signal,
            forceFault: request.simulate?.forceFault,
            artificialLatencyMs: request.simulate?.artificialLatencyMs,
        });

        const endedAt = new Date().toISOString();

        if (executionResult.ok) {
            attempts.push({
                attemptNumber,
                modelId: currentModel.id,
                provider: currentModel.provider,
                mode,
                role,
                status: "succeeded",
                startedAt,
                endedAt,
                latencyMs: executionResult.response.latencyMs,
                usage: executionResult.response.usage,
                charge: executionResult.response.charge,
            });

            finalResponse = executionResult.response;
            runStatus = "succeeded";
            break;
        } else {
            const providerError = executionResult.error;
            lastError = providerError;

            attempts.push({
                attemptNumber,
                modelId: currentModel.id,
                provider: currentModel.provider,
                mode,
                role,
                status: "failed",
                startedAt,
                endedAt,
                latencyMs: executionResult.latencyMs,
                error: providerError,
            });

            // If cancelled, stop immediately
            if (controller.signal.aborted || providerError.code === "cancelled") {
                runStatus = "cancelled";
                break;
            }

            // Attempt fallback if allowed
            const remainingForFallback = Math.max(0, deadlineTimestamp - Date.now());
            let foundNextFallback: ModelMetadata | undefined;

            for (const fbCandidate of fallbackCandidates) {
                if (modelsAttempted.has(fbCandidate.modelId)) {
                    continue;
                }
                const candidateModel = candidates.find((m) => m.id === fbCandidate.modelId);
                if (!candidateModel) continue;

                const fbCheck = validateFallback(
                    candidateModel,
                    request.constraints ?? {},
                    remainingForFallback,
                );

                if (fbCheck.eligible) {
                    foundNextFallback = candidateModel;
                    break;
                }
            }

            if (foundNextFallback) {
                const nextAttemptNum = attemptNumber + 1;
                fallbackTrace.push({
                    fromAttemptNumber: attemptNumber,
                    trigger: providerError.code === "timeout" ? "timeout" : "provider_error",
                    at: new Date().toISOString(),
                    outcome: "fell_back",
                    toAttemptNumber: nextAttemptNum,
                    toModelId: foundNextFallback.id,
                });

                currentModel = foundNextFallback;
                attemptNumber = nextAttemptNum;
            } else {
                fallbackTrace.push({
                    fromAttemptNumber: attemptNumber,
                    trigger: providerError.code === "timeout" ? "timeout" : "provider_error",
                    at: new Date().toISOString(),
                    outcome: "no_eligible_fallback",
                    reasons: [
                        {
                            code: "insufficient_deadline",
                            message: `No eligible fallback models available within remaining ${remainingForFallback}ms`,
                            remainingMs: remainingForFallback,
                            requiredMs: remainingForFallback + 100,
                        },
                    ],
                });

                runStatus = "failed";
                break;
            }
        }
    }

    const completedAt = new Date().toISOString();

    const runRecord: RunRecord = {
        runId,
        ...(requestId ? { requestId } : {}),
        status: runStatus === "executing" ? "failed" : runStatus,
        selectionMode,
        mode,
        createdAt,
        startedAt: attempts[0]?.startedAt,
        completedAt,
        ...(controller.signal.aborted ? { cancelRequestedAt: completedAt } : {}),
        ...(routingDecision ? { decision: routingDecision } : {}),
        attempts,
        fallbackTrace,
        ...(finalResponse ? { response: finalResponse } : {}),
        ...(runStatus === "failed" || (runStatus as string) === "executing"
            ? {
                  failure: {
                      code: (lastError?.code === "timeout" ? "timeout" : "provider_error") as
                          | "timeout"
                          | "provider_error",
                      message: lastError?.message ?? "Execution failed across all eligible attempts",
                  },
              }
            : {}),
    };

    await saveRunRecord(runRecord);
    return runRecord;
}
