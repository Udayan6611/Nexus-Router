import { z } from "zod";
import { explicitConstraintsSchema, optimizationPreferenceSchema, taskTypeSchema } from "@/lib/contracts/routing";
import { inferenceInputSchema } from "@/lib/contracts/inference";
import { modelIdSchema, executionModeSchema } from "@/lib/contracts/primitives";

export const simulationControlsSchema = z.strictObject({
    forceFault: z.enum(["timeout", "rate_limited", "server_error", "unavailable"]).optional(),
    artificialLatencyMs: z.int().min(0).max(600_000).optional(),
});
export type SimulationControls = z.infer<typeof simulationControlsSchema>;

export const routeExecutionRequestSchema = z.strictObject({
    preference: optimizationPreferenceSchema.default("cost"),
    constraints: explicitConstraintsSchema.default({}),
    taskType: taskTypeSchema.optional(),
    input: inferenceInputSchema,
    mode: executionModeSchema.default("simulated"),
    simulate: simulationControlsSchema.optional(),
    timeoutMs: z.int().min(100).max(600_000).default(30_000),
});
export type RouteExecutionRequest = z.infer<typeof routeExecutionRequestSchema>;

export const playgroundRunRequestSchema = z.strictObject({
    selectionMode: z.enum(["selected", "automatic"]).default("automatic"),
    modelId: modelIdSchema.optional(),
    preference: optimizationPreferenceSchema.default("cost"),
    constraints: explicitConstraintsSchema.default({}),
    taskType: taskTypeSchema.optional(),
    input: inferenceInputSchema,
    mode: executionModeSchema.default("simulated"),
    simulate: simulationControlsSchema.optional(),
    timeoutMs: z.int().min(100).max(600_000).default(30_000),
}).refine(
    (req) => req.selectionMode !== "selected" || Boolean(req.modelId),
    { message: "modelId is required when selectionMode is 'selected'", path: ["modelId"] },
);
export type PlaygroundRunRequest = z.infer<typeof playgroundRunRequestSchema>;

export const cancelRunResponseSchema = z.strictObject({
    runId: z.string(),
    status: z.enum(["cancelled", "cancellation_requested", "not_cancellable"]),
    message: z.string(),
});
export type CancelRunResponse = z.infer<typeof cancelRunResponseSchema>;
