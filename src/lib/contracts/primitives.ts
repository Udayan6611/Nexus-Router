import { z } from "zod";
import { REQUEST_ID_PATTERN, RUN_ID_PATTERN } from "@/lib/ids";

/** Upper bound for any latency, timeout or deadline value: 10 minutes. */
export const MAX_LATENCY_MS = 600_000;
/** Upper bound for any token count. */
export const MAX_TOKENS = 100_000_000;

/** Stable catalogue ID. URL-safe slug (no "/"), so it works in /api/models/:id. */
export const modelIdSchema = z
    .string()
    .regex(/^[a-z0-9][a-z0-9._-]{0,127}$/, "Invalid model ID");

export const providerIdSchema = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, "Invalid provider ID");

/** The provider's own model name (may contain "/" or ":"). Never used in URLs. */
export const providerModelIdSchema = z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/, "Invalid provider model ID");

export const runIdSchema = z.string().regex(RUN_ID_PATTERN, "Invalid run ID");
export const requestIdSchema = z.string().regex(REQUEST_ID_PATTERN, "Invalid request ID");

export const isoTimestampSchema = z.iso.datetime();
export const confidenceSchema = z.number().min(0).max(1);
export const tokenCountSchema = z.int().min(0).max(MAX_TOKENS);
export const latencyMsSchema = z.int().min(0).max(MAX_LATENCY_MS);
export const usdSchema = z.number().min(0).max(1_000_000);

/** "simulated" results must never be presented as live provider performance. */
export const EXECUTION_MODES = ["live", "simulated"] as const;
export const executionModeSchema = z.enum(EXECUTION_MODES);
export type ExecutionMode = z.infer<typeof executionModeSchema>;

/** Reference to a catalogue model. Routing results use this instead of copying metadata. */
export const modelRefShape = {
    modelId: modelIdSchema,
    provider: providerIdSchema,
};
export const modelRefSchema = z.strictObject(modelRefShape);
export type ModelRef = z.infer<typeof modelRefSchema>;

/** Bounded array with unique items. */
export function uniqueItems<T extends z.ZodType>(item: T, max: number) {
    return z
        .array(item)
        .max(max)
        .refine((items) => new Set(items).size === items.length, {
            message: "Items must be unique",
        });
}