import { z } from "zod";
import {
    availabilityStateSchema,
    capabilitySchema,
    modelMetadataSchema,
    qualityTierSchema,
} from "@/lib/contracts/catalogue";
import { modelIdSchema, providerIdSchema } from "@/lib/contracts/primitives";

export const SORT_FIELDS = [
    "displayName",
    "pricing",
    "latency",
    "contextWindow",
    "quality",
    "updatedAt",
] as const;
export const sortFieldSchema = z.enum(SORT_FIELDS);
export type SortField = z.infer<typeof sortFieldSchema>;

export const modelsQuerySchema = z.strictObject({
    q: z.string().trim().max(100).optional(),
    provider: providerIdSchema.optional(),
    capability: capabilitySchema.optional(),
    qualityTier: qualityTierSchema.optional(),
    maxCostUsdPerMillion: z.coerce.number().positive().max(100_000).optional(),
    minContextTokens: z.coerce.number().int().positive().max(10_000_000).optional(),
    maxLatencyMs: z.coerce.number().int().positive().max(600_000).optional(),
    availability: availabilityStateSchema.optional(),
    sortBy: sortFieldSchema.default("displayName"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ModelsQuery = z.infer<typeof modelsQuerySchema>;

export const modelsPageSchema = z.strictObject({
    items: z.array(modelMetadataSchema),
    total: z.int().min(0),
    page: z.int().min(1),
    limit: z.int().min(1),
    hasMore: z.boolean(),
    source: z.enum(["database", "canonical_seed"]),
});
export type ModelsPage = z.infer<typeof modelsPageSchema>;

export const compareModelsRequestSchema = z.strictObject({
    modelIds: z.array(modelIdSchema).min(2).max(10),
});
export type CompareModelsRequest = z.infer<typeof compareModelsRequestSchema>;

export const modelComparisonHighlightSchema = z.strictObject({
    modelId: modelIdSchema,
    value: z.union([z.string(), z.number()]),
});

export const compareModelsResponseSchema = z.strictObject({
    models: z.array(modelMetadataSchema),
    comparison: z.strictObject({
        cheapest: modelComparisonHighlightSchema.optional(),
        fastest: modelComparisonHighlightSchema.optional(),
        highestQuality: modelComparisonHighlightSchema.optional(),
        largestContext: modelComparisonHighlightSchema.optional(),
    }),
});
export type CompareModelsResponse = z.infer<typeof compareModelsResponseSchema>;
