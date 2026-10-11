import type { ModelMetadata } from "@/lib/contracts/catalogue";

const GROQ_PROVENANCE = {
    basis: "verified" as const,
    source: "Groq official docs & pricing",
    sourceUrl: "https://groq.com/pricing",
    observedAt: "2026-10-11T00:00:00Z",
};

const SIMULATED_PROVENANCE = {
    basis: "simulated" as const,
    source: "Nexus Router offline simulator",
    observedAt: "2026-10-11T00:00:00Z",
};

export const CANONICAL_MODELS: readonly ModelMetadata[] = [
    {
        id: "llama-3.3-70b-versatile",
        provider: "groq",
        providerModelId: "llama-3.3-70b-versatile",
        displayName: "Llama 3.3 70B Versatile",
        description: "Meta high-parameter model optimized for reasoning, tools, and code hosted on Groq LPU.",
        contextWindow: {
            status: "known",
            value: { contextWindowTokens: 128_000, maxOutputTokens: 32_768 },
            provenance: GROQ_PROVENANCE,
        },
        pricing: {
            status: "known",
            value: { inputUsdPerMillionTokens: 0.59, outputUsdPerMillionTokens: 0.79 },
            provenance: GROQ_PROVENANCE,
        },
        latency: {
            status: "known",
            value: { p50Ms: 350, p95Ms: 650 },
            provenance: GROQ_PROVENANCE,
        },
        quality: {
            status: "known",
            value: { tier: "advanced" },
            provenance: GROQ_PROVENANCE,
        },
        availability: {
            status: "known",
            value: "available",
            provenance: GROQ_PROVENANCE,
        },
        capabilities: [
            { capability: "chat", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "tool_use", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "json_output", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "code", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "streaming", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "reasoning", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "vision", supported: { status: "known", value: false, provenance: GROQ_PROVENANCE } },
        ],
        updatedAt: "2026-10-11T00:00:00Z",
    },
    {
        id: "llama-3.1-8b-instant",
        provider: "groq",
        providerModelId: "llama-3.1-8b-instant",
        displayName: "Llama 3.1 8B Instant",
        description: "Ultra-fast low-latency model for instant responses, classification, and summarization.",
        contextWindow: {
            status: "known",
            value: { contextWindowTokens: 128_000, maxOutputTokens: 8_192 },
            provenance: GROQ_PROVENANCE,
        },
        pricing: {
            status: "known",
            value: { inputUsdPerMillionTokens: 0.05, outputUsdPerMillionTokens: 0.08 },
            provenance: GROQ_PROVENANCE,
        },
        latency: {
            status: "known",
            value: { p50Ms: 140, p95Ms: 280 },
            provenance: GROQ_PROVENANCE,
        },
        quality: {
            status: "known",
            value: { tier: "standard" },
            provenance: GROQ_PROVENANCE,
        },
        availability: {
            status: "known",
            value: "available",
            provenance: GROQ_PROVENANCE,
        },
        capabilities: [
            { capability: "chat", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "tool_use", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "json_output", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "code", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "streaming", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "reasoning", supported: { status: "known", value: false, provenance: GROQ_PROVENANCE } },
            { capability: "vision", supported: { status: "known", value: false, provenance: GROQ_PROVENANCE } },
        ],
        updatedAt: "2026-10-11T00:00:00Z",
    },
    {
        id: "mixtral-8x7b-32768",
        provider: "groq",
        providerModelId: "mixtral-8x7b-32768",
        displayName: "Mixtral 8x7B (32k)",
        description: "Mistral sparse mixture-of-experts model with 32k context.",
        contextWindow: {
            status: "known",
            value: { contextWindowTokens: 32_768, maxOutputTokens: 4_096 },
            provenance: GROQ_PROVENANCE,
        },
        pricing: {
            status: "known",
            value: { inputUsdPerMillionTokens: 0.24, outputUsdPerMillionTokens: 0.24 },
            provenance: GROQ_PROVENANCE,
        },
        latency: {
            status: "known",
            value: { p50Ms: 220, p95Ms: 440 },
            provenance: GROQ_PROVENANCE,
        },
        quality: {
            status: "known",
            value: { tier: "standard" },
            provenance: GROQ_PROVENANCE,
        },
        availability: {
            status: "known",
            value: "available",
            provenance: GROQ_PROVENANCE,
        },
        capabilities: [
            { capability: "chat", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "tool_use", supported: { status: "known", value: false, provenance: GROQ_PROVENANCE } },
            { capability: "json_output", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "code", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "streaming", supported: { status: "known", value: true, provenance: GROQ_PROVENANCE } },
            { capability: "reasoning", supported: { status: "known", value: false, provenance: GROQ_PROVENANCE } },
            { capability: "vision", supported: { status: "known", value: false, provenance: GROQ_PROVENANCE } },
        ],
        updatedAt: "2026-10-11T00:00:00Z",
    },
    {
        id: "sim-frontier-expert",
        provider: "simulator",
        providerModelId: "sim-frontier-expert",
        displayName: "Simulated Frontier Expert (Offline Demo)",
        description: "Simulated frontier-tier model for testing high-capability reasoning and large context routing.",
        contextWindow: {
            status: "known",
            value: { contextWindowTokens: 200_000, maxOutputTokens: 16_384 },
            provenance: SIMULATED_PROVENANCE,
        },
        pricing: {
            status: "known",
            value: { inputUsdPerMillionTokens: 2.50, outputUsdPerMillionTokens: 10.00 },
            provenance: SIMULATED_PROVENANCE,
        },
        latency: {
            status: "known",
            value: { p50Ms: 950, p95Ms: 1800 },
            provenance: SIMULATED_PROVENANCE,
        },
        quality: {
            status: "known",
            value: { tier: "frontier" },
            provenance: SIMULATED_PROVENANCE,
        },
        availability: {
            status: "known",
            value: "available",
            provenance: SIMULATED_PROVENANCE,
        },
        capabilities: [
            { capability: "chat", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "tool_use", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "json_output", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "code", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "streaming", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "reasoning", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "vision", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
        ],
        updatedAt: "2026-10-11T00:00:00Z",
    },
    {
        id: "sim-basic-fast",
        provider: "simulator",
        providerModelId: "sim-basic-fast",
        displayName: "Simulated Basic Fast (Offline Demo)",
        description: "Simulated basic-tier model with minimal latency and near-zero cost for simple jobs.",
        contextWindow: {
            status: "known",
            value: { contextWindowTokens: 16_000, maxOutputTokens: 2_048 },
            provenance: SIMULATED_PROVENANCE,
        },
        pricing: {
            status: "known",
            value: { inputUsdPerMillionTokens: 0.02, outputUsdPerMillionTokens: 0.04 },
            provenance: SIMULATED_PROVENANCE,
        },
        latency: {
            status: "known",
            value: { p50Ms: 80, p95Ms: 150 },
            provenance: SIMULATED_PROVENANCE,
        },
        quality: {
            status: "known",
            value: { tier: "basic" },
            provenance: SIMULATED_PROVENANCE,
        },
        availability: {
            status: "known",
            value: "available",
            provenance: SIMULATED_PROVENANCE,
        },
        capabilities: [
            { capability: "chat", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "tool_use", supported: { status: "known", value: false, provenance: SIMULATED_PROVENANCE } },
            { capability: "json_output", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "code", supported: { status: "known", value: false, provenance: SIMULATED_PROVENANCE } },
            { capability: "streaming", supported: { status: "known", value: true, provenance: SIMULATED_PROVENANCE } },
            { capability: "reasoning", supported: { status: "known", value: false, provenance: SIMULATED_PROVENANCE } },
            { capability: "vision", supported: { status: "known", value: false, provenance: SIMULATED_PROVENANCE } },
        ],
        updatedAt: "2026-10-11T00:00:00Z",
    },
];
