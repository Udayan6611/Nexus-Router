import { describe, expect, it } from "vitest";
import { modelMetadataSchema } from "@/lib/contracts/catalogue";
import { AppError } from "@/lib/errors";
import { CANONICAL_MODELS } from "./models";
import {
    compareModels,
    filterAndSortModels,
    getModelById,
    listModels,
} from "./repository";
import { modelsQuerySchema } from "./schemas";

describe("Module 2: Model Catalogue", () => {
    describe("canonical dataset validity", () => {
        it("validates every canonical model against modelMetadataSchema", () => {
            for (const model of CANONICAL_MODELS) {
                const result = modelMetadataSchema.safeParse(model);
                expect(result.success).toBe(true);
            }
        });

        it("ensures canonical model IDs are unique", () => {
            const ids = CANONICAL_MODELS.map((m) => m.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe("filtering and sorting", () => {
        it("returns all items when query is default", () => {
            const query = modelsQuerySchema.parse({});
            const { items, total } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(total).toBe(CANONICAL_MODELS.length);
            expect(items.length).toBe(CANONICAL_MODELS.length);
        });

        it("filters models by search query matching displayName or provider", () => {
            const query = modelsQuerySchema.parse({ q: "instant" });
            const { items } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(items.length).toBe(1);
            expect(items[0].id).toBe("llama-3.1-8b-instant");
        });

        it("filters models by provider", () => {
            const query = modelsQuerySchema.parse({ provider: "groq" });
            const { items } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(items.every((m) => m.provider === "groq")).toBe(true);
            expect(items.length).toBeGreaterThan(0);
        });

        it("filters models by capability", () => {
            const query = modelsQuerySchema.parse({ capability: "vision" });
            const { items } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(items.length).toBe(1);
            expect(items[0].id).toBe("sim-frontier-expert");
        });

        it("filters models by quality tier", () => {
            const query = modelsQuerySchema.parse({ qualityTier: "frontier" });
            const { items } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(items.length).toBe(1);
            expect(items[0].id).toBe("sim-frontier-expert");
        });

        it("filters models by max cost per million tokens", () => {
            const query = modelsQuerySchema.parse({ maxCostUsdPerMillion: 0.10 });
            const { items } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(items.length).toBeGreaterThanOrEqual(2);
            for (const item of items) {
                if (item.pricing.status === "known") {
                    expect(item.pricing.value.inputUsdPerMillionTokens).toBeLessThanOrEqual(0.10);
                }
            }
        });

        it("sorts by pricing ascending and descending", () => {
            const ascQuery = modelsQuerySchema.parse({ sortBy: "pricing", sortOrder: "asc" });
            const { items: ascItems } = filterAndSortModels(CANONICAL_MODELS, ascQuery);
            expect(ascItems[0].id).toBe("sim-basic-fast");

            const descQuery = modelsQuerySchema.parse({ sortBy: "pricing", sortOrder: "desc" });
            const { items: descItems } = filterAndSortModels(CANONICAL_MODELS, descQuery);
            expect(descItems[0].id).toBe("sim-frontier-expert");
        });

        it("sorts by latency ascending", () => {
            const query = modelsQuerySchema.parse({ sortBy: "latency", sortOrder: "asc" });
            const { items } = filterAndSortModels(CANONICAL_MODELS, query);
            expect(items[0].id).toBe("sim-basic-fast");
        });

        it("paginates results accurately", () => {
            const page1 = modelsQuerySchema.parse({ page: 1, limit: 2 });
            const { items: p1Items, total } = filterAndSortModels(CANONICAL_MODELS, page1);
            expect(p1Items.length).toBe(2);
            expect(total).toBe(CANONICAL_MODELS.length);

            const page2 = modelsQuerySchema.parse({ page: 2, limit: 2 });
            const { items: p2Items } = filterAndSortModels(CANONICAL_MODELS, page2);
            expect(p2Items.length).toBe(2);
            expect(p1Items[0].id).not.toBe(p2Items[0].id);
        });
    });

    describe("repository methods", () => {
        it("listModels returns page envelope with source metadata", async () => {
            const query = modelsQuerySchema.parse({ limit: 10 });
            const result = await listModels(query);
            expect(result.items.length).toBe(CANONICAL_MODELS.length);
            expect(result.total).toBe(CANONICAL_MODELS.length);
            expect(result.source).toBe("canonical_seed");
        });

        it("getModelById returns model metadata when exists", async () => {
            const model = await getModelById("llama-3.3-70b-versatile");
            expect(model).toBeDefined();
            expect(model?.displayName).toBe("Llama 3.3 70B Versatile");
        });

        it("getModelById returns undefined when model does not exist", async () => {
            const model = await getModelById("non-existent-model");
            expect(model).toBeUndefined();
        });

        it("compareModels computes highlights correctly", async () => {
            const comparison = await compareModels([
                "llama-3.1-8b-instant",
                "sim-frontier-expert",
                "sim-basic-fast",
            ]);
            expect(comparison.models.length).toBe(3);
            expect(comparison.comparison.cheapest?.modelId).toBe("sim-basic-fast");
            expect(comparison.comparison.fastest?.modelId).toBe("sim-basic-fast");
            expect(comparison.comparison.highestQuality?.modelId).toBe("sim-frontier-expert");
            expect(comparison.comparison.largestContext?.modelId).toBe("sim-frontier-expert");
        });

        it("compareModels throws not_found when any requested model is absent", async () => {
            await expect(
                compareModels(["llama-3.1-8b-instant", "unknown-model-xyz"]),
            ).rejects.toThrow(AppError);
        });
    });
});
