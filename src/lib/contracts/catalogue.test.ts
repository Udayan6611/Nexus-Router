import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
    METADATA_FIELDS,
    metadataValue,
    modelMetadataSchema,
    provenanceSchema,
    providerInfoSchema,
} from "@/lib/contracts";
import {
    SYNTHETIC_TS,
    accepts,
    clone,
    syntheticModel,
} from "@/lib/contracts/__fixtures__/synthetic";

const provenance = { basis: "verified", source: "synthetic", observedAt: SYNTHETIC_TS };

describe("modelMetadataSchema", () => {
    it("accepts a synthetic model mixing known, stale and unknown values", () => {
        expect(accepts(modelMetadataSchema, syntheticModel)).toBe(true);
    });

    it("rejects unknown top-level fields", () => {
        expect(accepts(modelMetadataSchema, { ...syntheticModel, extra: 1 })).toBe(false);
    });

    it.each(METADATA_FIELDS)("requires %s to be stated explicitly", (field) => {
        const model = clone(syntheticModel) as Record<string, unknown>;
        delete model[field];
        expect(accepts(modelMetadataSchema, model)).toBe(false);
    });

    it("represents unknown pricing explicitly, with no value", () => {
        const model = { ...syntheticModel, pricing: { status: "unknown", reason: "not_published" } };
        const result = modelMetadataSchema.safeParse(model);
        expect(result.success).toBe(true);
        if (result.success) expect("value" in result.data.pricing).toBe(false);
    });

    it("rejects an unknown value that smuggles in a zero price", () => {
        const pricing = {
            status: "unknown",
            value: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 },
        };
        expect(accepts(modelMetadataSchema, { ...syntheticModel, pricing })).toBe(false);
    });

    it("requires provenance for known and stale values", () => {
        const value = { inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 };
        expect(accepts(modelMetadataSchema, { ...syntheticModel, pricing: { status: "known", value } })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, pricing: { status: "stale", value } })).toBe(false);
        expect(
            accepts(modelMetadataSchema, { ...syntheticModel, pricing: { status: "stale", value, provenance } }),
        ).toBe(true);
    });

    it("rejects an unrecognised status", () => {
        expect(accepts(modelMetadataSchema, { ...syntheticModel, pricing: { status: "missing" } })).toBe(false);
    });

    it("allows an explicit known zero price, but not a negative one", () => {
        const free = { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 };
        const negative = { inputUsdPerMillionTokens: -1, outputUsdPerMillionTokens: 0 };
        expect(
            accepts(modelMetadataSchema, { ...syntheticModel, pricing: { status: "known", value: free, provenance } }),
        ).toBe(true);
        expect(
            accepts(modelMetadataSchema, { ...syntheticModel, pricing: { status: "known", value: negative, provenance } }),
        ).toBe(false);
    });

    it("enforces identifier and string bounds", () => {
        expect(accepts(modelMetadataSchema, { ...syntheticModel, id: "Test-Model" })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, id: "has/slash" })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, id: "" })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, id: "a".repeat(129) })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, providerModelId: "has space" })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, displayName: "x".repeat(121) })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, displayName: "x".repeat(120) })).toBe(true);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, description: "x".repeat(1001) })).toBe(false);
    });

    it("rejects duplicate or unrecognised capabilities", () => {
        const entry = { capability: "chat", supported: { status: "unknown" } };
        expect(accepts(modelMetadataSchema, { ...syntheticModel, capabilities: [entry, entry] })).toBe(false);
        expect(
            accepts(modelMetadataSchema, {
                ...syntheticModel,
                capabilities: [{ capability: "telepathy", supported: { status: "unknown" } }],
            }),
        ).toBe(false);
    });

    it("allows an explicit known-false capability", () => {
        const capabilities = [{ capability: "vision", supported: { status: "known", value: false, provenance } }];
        expect(accepts(modelMetadataSchema, { ...syntheticModel, capabilities })).toBe(true);
    });

    it("rejects inconsistent latency and context-window values", () => {
        const latency = { status: "known", value: { p50Ms: 500, p95Ms: 100 }, provenance };
        expect(accepts(modelMetadataSchema, { ...syntheticModel, latency })).toBe(false);
        const contextWindow = {
            status: "known",
            value: { contextWindowTokens: 1000, maxOutputTokens: 2000 },
            provenance,
        };
        expect(accepts(modelMetadataSchema, { ...syntheticModel, contextWindow })).toBe(false);
    });

    it("rejects malformed timestamps", () => {
        expect(accepts(modelMetadataSchema, { ...syntheticModel, updatedAt: "yesterday" })).toBe(false);
        expect(accepts(modelMetadataSchema, { ...syntheticModel, updatedAt: "2026-10-11" })).toBe(false);
    });
});

describe("provenanceSchema", () => {
    it("accepts http(s) source URLs only", () => {
        expect(accepts(provenanceSchema, { ...provenance, sourceUrl: "https://example.com/docs" })).toBe(true);
        expect(accepts(provenanceSchema, { ...provenance, sourceUrl: "javascript:alert(1)" })).toBe(false);
        expect(accepts(provenanceSchema, { ...provenance, sourceUrl: "ftp://example.com/x" })).toBe(false);
    });

    it("rejects an unknown basis", () => {
        expect(accepts(provenanceSchema, { ...provenance, basis: "guess" })).toBe(false);
    });
});

describe("metadataValue", () => {
    it("wraps any value schema with the known/stale/unknown union", () => {
        const schema = metadataValue(z.string());
        expect(accepts(schema, { status: "known", value: "x", provenance })).toBe(true);
        expect(accepts(schema, { status: "unknown", reason: "not_published" })).toBe(true);
        expect(accepts(schema, { status: "unknown", reason: "because" })).toBe(false);
        expect(accepts(schema, { status: "known", value: 5, provenance })).toBe(false);
    });
});

describe("providerInfoSchema", () => {
    it("validates provider identity", () => {
        expect(accepts(providerInfoSchema, { id: "test-provider", displayName: "Test Provider" })).toBe(true);
        expect(accepts(providerInfoSchema, { id: "Bad Id", displayName: "x" })).toBe(false);
    });
});