import { z } from "zod";
import {
    MAX_LATENCY_MS,
    MAX_TOKENS,
    isoTimestampSchema,
    modelIdSchema,
    providerIdSchema,
    providerModelIdSchema,
} from "@/lib/contracts/primitives";

/**
 * THE shared model-catalogue contract. Other modules (including the AI/RAG modules)
 * must consume these schemas rather than define their own model shape.
 *
 * Rule: every metadata field is a known / stale / unknown wrapper and is REQUIRED.
 * "unknown" must be stated explicitly. It is never a guaranteed capability or a zero price.
 */

export const PROVENANCE_BASES = ["verified", "measured", "estimated", "simulated"] as const;
export const provenanceBasisSchema = z.enum(PROVENANCE_BASES);

export const provenanceSchema = z.strictObject({
    basis: provenanceBasisSchema,
    source: z.string().min(1).max(200),
    sourceUrl: z.url({ protocol: /^https?$/ }).max(2048).optional(),
    observedAt: isoTimestampSchema,
    staleAfter: isoTimestampSchema.optional(),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const UNKNOWN_REASONS = ["not_published", "not_yet_checked", "not_applicable"] as const;
export const unknownReasonSchema = z.enum(UNKNOWN_REASONS);

/** known: usable. stale: value exists but is past its freshness window. unknown: no value. */
export function metadataValue<T extends z.ZodType>(value: T) {
    return z.discriminatedUnion("status", [
        z.strictObject({ status: z.literal("known"), value, provenance: provenanceSchema }),
        z.strictObject({ status: z.literal("stale"), value, provenance: provenanceSchema }),
        z.strictObject({ status: z.literal("unknown"), reason: unknownReasonSchema.optional() }),
    ]);
}

export type MetadataValue<T> =
    | { status: "known"; value: T; provenance: Provenance }
    | { status: "stale"; value: T; provenance: Provenance }
    | { status: "unknown"; reason?: (typeof UNKNOWN_REASONS)[number] };

// Capabilities
export const CAPABILITIES = [
    "chat",
    "tool_use",
    "json_output",
    "vision",
    "reasoning",
    "code",
    "streaming",
] as const;
export const capabilitySchema = z.enum(CAPABILITIES);
export type Capability = z.infer<typeof capabilitySchema>;

export const capabilitySupportSchema = z.strictObject({
    capability: capabilitySchema,
    supported: metadataValue(z.boolean()),
});

/** A capability that is absent from the list is UNKNOWN, never assumed supported. */
const capabilitiesSchema = z
    .array(capabilitySupportSchema)
    .max(CAPABILITIES.length)
    .refine(
        (entries) => new Set(entries.map((entry) => entry.capability)).size === entries.length,
        { message: "Each capability may appear at most once" },
    );

// Other metadata values
export const contextWindowSchema = z
    .strictObject({
        contextWindowTokens: z.int().min(1).max(MAX_TOKENS),
        maxOutputTokens: z.int().min(1).max(MAX_TOKENS).optional(),
    })
    .refine(
        (window) =>
            window.maxOutputTokens === undefined ||
            window.maxOutputTokens <= window.contextWindowTokens,
        { message: "maxOutputTokens must not exceed contextWindowTokens", path: ["maxOutputTokens"] },
    );

const usdPerMillionTokens = z.number().min(0).max(100_000);
/** A price of 0 is valid only as an explicit, known value (for example a free tier). */
export const pricingSchema = z.strictObject({
    inputUsdPerMillionTokens: usdPerMillionTokens,
    outputUsdPerMillionTokens: usdPerMillionTokens,
});

export const latencyProfileSchema = z
    .strictObject({
        p50Ms: z.int().min(1).max(MAX_LATENCY_MS),
        p95Ms: z.int().min(1).max(MAX_LATENCY_MS).optional(),
    })
    .refine((profile) => profile.p95Ms === undefined || profile.p95Ms >= profile.p50Ms, {
        message: "p95Ms must not be lower than p50Ms",
        path: ["p95Ms"],
    });

/** Ordered from lowest to highest. */
export const QUALITY_TIERS = ["basic", "standard", "advanced", "frontier"] as const;
export const qualityTierSchema = z.enum(QUALITY_TIERS);
export type QualityTier = z.infer<typeof qualityTierSchema>;
export const qualitySchema = z.strictObject({ tier: qualityTierSchema });

export const AVAILABILITY_STATES = ["available", "degraded", "unavailable"] as const;
export const availabilityStateSchema = z.enum(AVAILABILITY_STATES);

/** Names the metadata fields that routing rejections can refer to. */
export const METADATA_FIELDS = [
    "contextWindow",
    "pricing",
    "latency",
    "quality",
    "availability",
    "capabilities",
] as const;
export const metadataFieldSchema = z.enum(METADATA_FIELDS);
export type MetadataField = z.infer<typeof metadataFieldSchema>;

export const providerInfoSchema = z.strictObject({
    id: providerIdSchema,
    displayName: z.string().min(1).max(120),
    websiteUrl: z.url({ protocol: /^https?$/ }).max(2048).optional(),
});
export type ProviderInfo = z.infer<typeof providerInfoSchema>;

export const modelMetadataSchema = z.strictObject({
    id: modelIdSchema,
    provider: providerIdSchema,
    providerModelId: providerModelIdSchema,
    displayName: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    contextWindow: metadataValue(contextWindowSchema),
    pricing: metadataValue(pricingSchema),
    latency: metadataValue(latencyProfileSchema),
    quality: metadataValue(qualitySchema),
    availability: metadataValue(availabilityStateSchema),
    capabilities: capabilitiesSchema,
    updatedAt: isoTimestampSchema,
});
export type ModelMetadata = z.infer<typeof modelMetadataSchema>;