import type { RunRecord } from "@/lib/contracts/runs";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/server/supabase";
import { getAllTrackedRuns, getTrackedRun, updateTrackedRun } from "@/lib/orchestration/tracker";
import type { RunTrace, UsageQuery, UsageSummary } from "./types";

export interface PersistenceResult {
    readonly persisted: boolean;
    readonly source: "database" | "in_memory_recent";
    readonly error?: string;
}

export async function saveRunRecord(run: RunRecord): Promise<PersistenceResult> {
    updateTrackedRun(run);

    if (isSupabaseConfigured()) {
        try {
            const client = getSupabaseClient();
            const { error: runError } = await client.from("runs").upsert({
                id: run.runId,
                request_id: run.requestId ?? null,
                status: run.status,
                selection_mode: run.selectionMode,
                mode: run.mode,
                created_at: run.createdAt,
                started_at: run.startedAt ?? null,
                completed_at: run.completedAt ?? null,
                cancel_requested_at: run.cancelRequestedAt ?? null,
                decision: run.decision ?? null,
                attempts: run.attempts,
                fallback_trace: run.fallbackTrace,
                response: run.response ?? null,
                failure: run.failure ?? null,
            });

            if (runError) {
                return {
                    persisted: false,
                    source: "in_memory_recent",
                    error: runError.message,
                };
            }

            // Save usage events if attempts exist
            for (const attempt of run.attempts) {
                if (attempt.usage || attempt.charge) {
                    await client.from("usage_events").insert({
                        run_id: run.runId,
                        model_id: attempt.modelId,
                        provider: attempt.provider,
                        mode: attempt.mode,
                        at: attempt.endedAt ?? run.completedAt ?? new Date().toISOString(),
                        latency_ms: attempt.latencyMs ?? null,
                        input_tokens: attempt.usage?.inputTokens ?? null,
                        output_tokens: attempt.usage?.outputTokens ?? null,
                        token_source: attempt.usage?.source ?? null,
                        reported_cost_usd: attempt.charge?.kind === "provider_reported" ? attempt.charge.amountUsd : null,
                        estimated_cost_usd: attempt.charge?.kind === "estimated" ? attempt.charge.amountUsd : null,
                    });
                }
            }

            return {
                persisted: true,
                source: "database",
            };
        } catch (err: unknown) {
            return {
                persisted: false,
                source: "in_memory_recent",
                error: err instanceof Error ? err.message : "Database error",
            };
        }
    }

    return {
        persisted: false,
        source: "in_memory_recent",
    };
}

export async function fetchRunById(
    runId: string,
): Promise<{ run: RunRecord; source: "database" | "in_memory_recent" } | undefined> {
    if (isSupabaseConfigured()) {
        try {
            const client = getSupabaseClient();
            const { data, error } = await client.from("runs").select("*").eq("id", runId).single();
            if (!error && data) {
                const run: RunRecord = {
                    runId: data.id,
                    ...(data.request_id ? { requestId: data.request_id } : {}),
                    status: data.status,
                    selectionMode: data.selection_mode,
                    mode: data.mode,
                    createdAt: data.created_at,
                    ...(data.started_at ? { startedAt: data.started_at } : {}),
                    ...(data.completed_at ? { completedAt: data.completed_at } : {}),
                    ...(data.cancel_requested_at ? { cancelRequestedAt: data.cancel_requested_at } : {}),
                    ...(data.decision ? { decision: data.decision } : {}),
                    attempts: data.attempts ?? [],
                    fallbackTrace: data.fallback_trace ?? [],
                    ...(data.response ? { response: data.response } : {}),
                    ...(data.failure ? { failure: data.failure } : {}),
                };
                return { run, source: "database" };
            }
        } catch {
            // fall back to in-memory store
        }
    }

    const inMemory = getTrackedRun(runId);
    if (inMemory) {
        return { run: inMemory, source: "in_memory_recent" };
    }

    return undefined;
}

export async function fetchRunTrace(runId: string): Promise<RunTrace | undefined> {
    const fetched = await fetchRunById(runId);
    if (!fetched) return undefined;

    const { run, source } = fetched;
    return {
        runId: run.runId,
        status: run.status,
        mode: run.mode,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        decision: run.decision,
        attempts: run.attempts,
        fallbackTrace: run.fallbackTrace,
        storageSource: source,
    };
}

export async function fetchUsageSummary(query: UsageQuery = {}): Promise<UsageSummary> {
    // If Supabase is configured and has data, calculate from DB
    if (isSupabaseConfigured()) {
        try {
            const client = getSupabaseClient();
            let dbQuery = client.from("usage_events").select("*");
            if (query.provider) dbQuery = dbQuery.eq("provider", query.provider);
            if (query.modelId) dbQuery = dbQuery.eq("model_id", query.modelId);
            if (query.from) dbQuery = dbQuery.gte("at", query.from);
            if (query.to) dbQuery = dbQuery.lte("at", query.to);

            const { data, error } = await dbQuery;
            if (!error && Array.isArray(data) && data.length > 0) {
                let totalInput = 0;
                let totalOutput = 0;
                let totalReported = 0;
                let totalEstimated = 0;
                let totalLatency = 0;
                let latencyCount = 0;

                for (const row of data) {
                    if (row.input_tokens) totalInput += row.input_tokens;
                    if (row.output_tokens) totalOutput += row.output_tokens;
                    if (row.reported_cost_usd) totalReported += Number(row.reported_cost_usd);
                    if (row.estimated_cost_usd) totalEstimated += Number(row.estimated_cost_usd);
                    if (row.latency_ms) {
                        totalLatency += row.latency_ms;
                        latencyCount++;
                    }
                }

                return {
                    totalRuns: data.length,
                    successfulRuns: data.length,
                    failedRuns: 0,
                    totalInputTokens: totalInput,
                    totalOutputTokens: totalOutput,
                    totalReportedChargeUsd: Number(totalReported.toFixed(6)),
                    totalEstimatedCostUsd: Number(totalEstimated.toFixed(6)),
                    averageLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
                    storageSource: "database",
                };
            }
        } catch {
            // fall back to in-memory summary
        }
    }

    // In-memory aggregation across tracked runs
    const allRuns = getAllTrackedRuns();
    let totalRuns = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalReportedChargeUsd = 0;
    let totalEstimatedCostUsd = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    for (const run of allRuns) {
        if (query.from && run.createdAt < query.from) continue;
        if (query.to && run.createdAt > query.to) continue;

        totalRuns++;
        if (run.status === "succeeded") successfulRuns++;
        if (run.status === "failed") failedRuns++;

        for (const attempt of run.attempts) {
            if (query.provider && attempt.provider !== query.provider) continue;
            if (query.modelId && attempt.modelId !== query.modelId) continue;

            if (attempt.usage) {
                totalInputTokens += attempt.usage.inputTokens;
                totalOutputTokens += attempt.usage.outputTokens;
            }
            if (attempt.charge) {
                if (attempt.charge.kind === "provider_reported") {
                    totalReportedChargeUsd += attempt.charge.amountUsd;
                } else {
                    totalEstimatedCostUsd += attempt.charge.amountUsd;
                }
            }
            if (attempt.latencyMs) {
                totalLatency += attempt.latencyMs;
                latencyCount++;
            }
        }
    }

    return {
        totalRuns,
        successfulRuns,
        failedRuns,
        totalInputTokens,
        totalOutputTokens,
        totalReportedChargeUsd: Number(totalReportedChargeUsd.toFixed(6)),
        totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
        averageLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
        storageSource: "in_memory_recent",
    };
}
