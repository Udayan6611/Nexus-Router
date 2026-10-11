import type { RunRecord } from "@/lib/contracts/runs";

interface ActiveRunState {
    readonly controller: AbortController;
    readonly createdAt: string;
    run?: RunRecord;
}

const activeRuns = new Map<string, ActiveRunState>();
const completedRuns = new Map<string, RunRecord>();
const MAX_COMPLETED_RUNS = 200;

export function registerActiveRun(runId: string, controller: AbortController): void {
    activeRuns.set(runId, {
        controller,
        createdAt: new Date().toISOString(),
    });
}

export function updateTrackedRun(run: RunRecord): void {
    const active = activeRuns.get(run.runId);
    if (active) {
        active.run = run;
    }
    if (run.completedAt) {
        activeRuns.delete(run.runId);
        if (completedRuns.size >= MAX_COMPLETED_RUNS) {
            const firstKey = completedRuns.keys().next().value;
            if (firstKey) completedRuns.delete(firstKey);
        }
        completedRuns.set(run.runId, run);
    }
}

export function requestRunCancellation(runId: string): {
    cancelled: boolean;
    status: "cancelled" | "cancellation_requested" | "not_cancellable";
    message: string;
} {
    const active = activeRuns.get(runId);
    if (active) {
        active.controller.abort();
        return {
            cancelled: true,
            status: "cancellation_requested",
            message: `Cancellation requested for active run ${runId}`,
        };
    }

    const completed = completedRuns.get(runId);
    if (completed) {
        return {
            cancelled: false,
            status: "not_cancellable",
            message: `Run ${runId} has already completed with status '${completed.status}'`,
        };
    }

    return {
        cancelled: false,
        status: "not_cancellable",
        message: `Run ${runId} not found in active execution queue`,
    };
}

export function getTrackedRun(runId: string): RunRecord | undefined {
    return activeRuns.get(runId)?.run ?? completedRuns.get(runId);
}

export function getAllTrackedRuns(): readonly RunRecord[] {
    const list: RunRecord[] = [];
    for (const entry of activeRuns.values()) {
        if (entry.run) list.push(entry.run);
    }
    for (const run of completedRuns.values()) {
        list.push(run);
    }
    return list;
}

export function clearTrackedRuns(): void {
    activeRuns.clear();
    completedRuns.clear();
}
