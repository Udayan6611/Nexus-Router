import {
    modelMetadataSchema,
    type Capability,
    type ModelMetadata,
    type QualityTier,
} from "@/lib/contracts/catalogue";
import { AppError } from "@/lib/errors";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/server/supabase";
import { CANONICAL_MODELS } from "./models";
import type {
    CompareModelsResponse,
    ModelsPage,
    ModelsQuery,
} from "./schemas";

const QUALITY_RANK: Record<QualityTier, number> = {
    basic: 10,
    standard: 20,
    advanced: 30,
    frontier: 40,
};

function matchesSearch(model: ModelMetadata, q: string): boolean {
    const term = q.toLowerCase();
    return (
        model.id.toLowerCase().includes(term) ||
        model.displayName.toLowerCase().includes(term) ||
        model.provider.toLowerCase().includes(term) ||
        (model.description?.toLowerCase().includes(term) ?? false)
    );
}

function hasCapability(model: ModelMetadata, capability: Capability): boolean {
    const entry = model.capabilities.find((c) => c.capability === capability);
    return entry?.supported.status === "known" && entry.supported.value === true;
}

export function filterAndSortModels(
    models: readonly ModelMetadata[],
    query: Partial<ModelsQuery> = {},
): { items: ModelMetadata[]; total: number } {
    let filtered = [...models];

    if (query.q) {
        filtered = filtered.filter((m) => matchesSearch(m, query.q!));
    }
    if (query.provider) {
        filtered = filtered.filter((m) => m.provider === query.provider);
    }
    if (query.capability) {
        filtered = filtered.filter((m) => hasCapability(m, query.capability!));
    }
    if (query.qualityTier) {
        filtered = filtered.filter(
            (m) =>
                m.quality.status === "known" &&
                m.quality.value.tier === query.qualityTier,
        );
    }
    if (query.maxCostUsdPerMillion !== undefined) {
        filtered = filtered.filter(
            (m) =>
                m.pricing.status === "known" &&
                m.pricing.value.inputUsdPerMillionTokens <= query.maxCostUsdPerMillion!,
        );
    }
    if (query.minContextTokens !== undefined) {
        filtered = filtered.filter(
            (m) =>
                m.contextWindow.status === "known" &&
                m.contextWindow.value.contextWindowTokens >= query.minContextTokens!,
        );
    }
    if (query.maxLatencyMs !== undefined) {
        filtered = filtered.filter(
            (m) =>
                m.latency.status === "known" &&
                m.latency.value.p50Ms <= query.maxLatencyMs!,
        );
    }
    if (query.availability) {
        filtered = filtered.filter(
            (m) =>
                m.availability.status === "known" &&
                m.availability.value === query.availability,
        );
    }

    const total = filtered.length;
    const orderMultiplier = query.sortOrder === "desc" ? -1 : 1;

    filtered.sort((a, b) => {
        switch (query.sortBy) {
            case "pricing": {
                const aPrice = a.pricing.status === "known" ? a.pricing.value.inputUsdPerMillionTokens : Infinity;
                const bPrice = b.pricing.status === "known" ? b.pricing.value.inputUsdPerMillionTokens : Infinity;
                return (aPrice - bPrice) * orderMultiplier;
            }
            case "latency": {
                const aLat = a.latency.status === "known" ? a.latency.value.p50Ms : Infinity;
                const bLat = b.latency.status === "known" ? b.latency.value.p50Ms : Infinity;
                return (aLat - bLat) * orderMultiplier;
            }
            case "contextWindow": {
                const aCtx = a.contextWindow.status === "known" ? a.contextWindow.value.contextWindowTokens : 0;
                const bCtx = b.contextWindow.status === "known" ? b.contextWindow.value.contextWindowTokens : 0;
                return (aCtx - bCtx) * orderMultiplier;
            }
            case "quality": {
                const aQ = a.quality.status === "known" ? QUALITY_RANK[a.quality.value.tier] : 0;
                const bQ = b.quality.status === "known" ? QUALITY_RANK[b.quality.value.tier] : 0;
                return (aQ - bQ) * orderMultiplier;
            }
            case "updatedAt": {
                return (Date.parse(a.updatedAt) - Date.parse(b.updatedAt)) * orderMultiplier;
            }
            case "displayName":
            default:
                return a.displayName.localeCompare(b.displayName) * orderMultiplier;
        }
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return { items: paginated, total };
}

export function mapDbRowToModelMetadata(row: Record<string, unknown>): ModelMetadata | undefined {
    const raw = {
        id: row.id,
        provider: row.provider ?? row.provider_id,
        providerModelId: row.providerModelId ?? row.provider_model_id,
        displayName: row.displayName ?? row.display_name,
        description: row.description ?? undefined,
        contextWindow: row.contextWindow ?? row.context_window,
        pricing: row.pricing,
        latency: row.latency,
        quality: row.quality,
        availability: row.availability,
        capabilities: row.capabilities,
        updatedAt: row.updatedAt ?? row.updated_at,
    };
    const parsed = modelMetadataSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
}

export async function getAllCatalogueModels(): Promise<{ models: readonly ModelMetadata[]; source: "database" | "canonical_seed" }> {
    if (isSupabaseConfigured()) {
        try {
            const client = getSupabaseClient();
            const { data, error } = await client.from("models").select("*");
            if (!error && Array.isArray(data) && data.length > 0) {
                const mapped = data
                    .map((row) => mapDbRowToModelMetadata(row as Record<string, unknown>))
                    .filter((m): m is ModelMetadata => m !== undefined);
                if (mapped.length > 0) {
                    return { models: mapped, source: "database" };
                }
            }
        } catch {
            // DB not reachable or table missing: fall through safely
        }
    }
    return { models: CANONICAL_MODELS, source: "canonical_seed" };
}

export async function listModels(query: Partial<ModelsQuery> = {}): Promise<ModelsPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { models, source } = await getAllCatalogueModels();
    const { items, total } = filterAndSortModels(models, query);
    const hasMore = page * limit < total;

    return {
        items,
        total,
        page,
        limit,
        hasMore,
        source,
    };
}

export async function getModelById(id: string): Promise<ModelMetadata | undefined> {
    const { models } = await getAllCatalogueModels();
    return models.find((m) => m.id === id);
}

export async function compareModels(modelIds: readonly string[]): Promise<CompareModelsResponse> {
    const { models } = await getAllCatalogueModels();
    const foundModels: ModelMetadata[] = [];
    const missing: string[] = [];

    for (const id of modelIds) {
        const found = models.find((m) => m.id === id);
        if (found) {
            foundModels.push(found);
        } else {
            missing.push(id);
        }
    }

    if (missing.length > 0) {
        throw new AppError("not_found", {
            message: `Models not found: ${missing.join(", ")}`,
            details: missing.map((id) => ({ path: "modelIds", message: `Model '${id}' not found` })),
        });
    }

    let cheapest: { modelId: string; value: number } | undefined;
    let fastest: { modelId: string; value: number } | undefined;
    let highestQuality: { modelId: string; value: string } | undefined;
    let highestQualityRank = -1;
    let largestContext: { modelId: string; value: number } | undefined;

    for (const model of foundModels) {
        if (model.pricing.status === "known") {
            const cost = model.pricing.value.inputUsdPerMillionTokens;
            if (!cheapest || cost < (cheapest.value as number)) {
                cheapest = { modelId: model.id, value: cost };
            }
        }
        if (model.latency.status === "known") {
            const lat = model.latency.value.p50Ms;
            if (!fastest || lat < (fastest.value as number)) {
                fastest = { modelId: model.id, value: lat };
            }
        }
        if (model.quality.status === "known") {
            const rank = QUALITY_RANK[model.quality.value.tier];
            if (rank > highestQualityRank) {
                highestQualityRank = rank;
                highestQuality = { modelId: model.id, value: model.quality.value.tier };
            }
        }
        if (model.contextWindow.status === "known") {
            const ctx = model.contextWindow.value.contextWindowTokens;
            if (!largestContext || ctx > (largestContext.value as number)) {
                largestContext = { modelId: model.id, value: ctx };
            }
        }
    }

    return {
        models: foundModels,
        comparison: {
            cheapest,
            fastest,
            highestQuality,
            largestContext,
        },
    };
}
