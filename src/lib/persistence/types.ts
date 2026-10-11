import { z } from "zod";
import {
    executionAttemptSchema,
    fallbackStepSchema,
    runStatusSchema,
} from "@/lib/contracts/runs";
import { executionModeSchema, isoTimestampSchema } from "@/lib/contracts/primitives";
import { routingDecisionSchema } from "@/lib/contracts/routing";

export const runTraceSchema = z.strictObject({
    runId: z.string(),
    status: runStatusSchema,
    mode: executionModeSchema,
    createdAt: isoTimestampSchema,
    completedAt: isoTimestampSchema.optional(),
    decision: routingDecisionSchema.optional(),
    attempts: z.array(executionAttemptSchema),
    fallbackTrace: z.array(fallbackStepSchema),
    storageSource: z.enum(["database", "in_memory_recent"]),
});
export type RunTrace = z.infer<typeof runTraceSchema>;

export const usageSummarySchema = z.strictObject({
    totalRuns: z.int().min(0),
    successfulRuns: z.int().min(0),
    failedRuns: z.int().min(0),
    totalInputTokens: z.int().min(0),
    totalOutputTokens: z.int().min(0),
    totalReportedChargeUsd: z.number().min(0),
    totalEstimatedCostUsd: z.number().min(0),
    averageLatencyMs: z.number().min(0),
    storageSource: z.enum(["database", "in_memory_recent"]),
});
export type UsageSummary = z.infer<typeof usageSummarySchema>;

export const usageQuerySchema = z.strictObject({
    provider: z.string().optional(),
    modelId: z.string().optional(),
    from: isoTimestampSchema.optional(),
    to: isoTimestampSchema.optional(),
});
export type UsageQuery = z.infer<typeof usageQuerySchema>;
