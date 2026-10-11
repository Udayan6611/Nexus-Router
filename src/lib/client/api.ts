/**
 * Typed client library for NEXUS ROUTER backend API endpoints.
 */

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: {
        requestId: string;
        timestamp: string;
    };
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface ModelMetadataItem {
    id: string;
    name: string;
    provider: string;
    tier: "budget" | "balanced" | "flagship";
    contextWindow: number;
    costPer1kInput: number;
    costPer1kOutput: number;
    inputModalities: string[];
    outputModalities: string[];
    supportedTasks: string[];
    capabilities: string[];
    family?: string;
    isDefault?: boolean;
}

export interface RunRecordItem {
    id: string;
    status: "succeeded" | "failed" | "no_eligible_model" | "cancelled" | "fallback_exhausted";
    selectedModelId?: string;
    routingDecision?: {
        selectedModelId?: string;
        rejectionReasons?: Record<string, string>;
        tradeoffs?: string[];
        ruleApplied?: string;
    };
    response?: {
        output: string;
        usage?: {
            inputTokens: number;
            outputTokens: number;
            costUsd: number;
        };
        latencyMs?: number;
    };
    attempts?: Array<{
        attemptIndex: number;
        modelId: string;
        status: "succeeded" | "failed";
        latencyMs: number;
        error?: { code: string; message: string };
    }>;
    createdAt?: string;
    storageSource?: string;
}

export interface RecommendationSummaryItem {
    requirements: {
        taskType: string;
        complexity: string;
        optimization: string;
        hardConstraints: Array<{ text: string; evidence: string }>;
        inferredRequirements: Array<{ text: string; confidence: number; rationale: string }>;
        summary: string;
    };
    topRecommendation: {
        candidate: {
            id: string;
            name: string;
            provider: string;
            tier: string;
            qualityTier: string;
            latencyTier: string;
            costPer1kInput: number;
            costPer1kOutput: number;
        };
        score: number;
        fit: string;
        reasons: string[];
    };
    rankedRecommendations: Array<{
        candidate: {
            id: string;
            name: string;
            provider: string;
            tier: string;
            costPer1kInput: number;
            costPer1kOutput: number;
        };
        score: number;
        fit: string;
        reasons: string[];
    }>;
    explanation: {
        rationale: string;
        tradeoffs: string[];
        mandatoryRouterNotice: string;
    };
}

async function handleResponse<T>(res: Response): Promise<T> {
    const json = await res.json();
    if (!res.ok || json.success === false) {
        const message = json.error?.message || `Request failed with status ${res.status}`;
        throw new Error(message);
    }
    return json.data;
}

export const apiClient = {
    async getModels(params?: { provider?: string; taskType?: string }): Promise<{ items: ModelMetadataItem[]; total: number }> {
        const query = new URLSearchParams();
        if (params?.provider) query.set("provider", params.provider);
        if (params?.taskType) query.set("taskType", params.taskType);
        const res = await fetch(`/api/models?${query.toString()}`);
        return handleResponse(res);
    },

    async getModel(id: string): Promise<ModelMetadataItem> {
        const res = await fetch(`/api/models/${encodeURIComponent(id)}`);
        return handleResponse(res);
    },

    async routeTask(payload: {
        prompt: string;
        taskType?: string;
        optimizationPreference?: string;
        constraints?: {
            maxCostUsd?: number;
            maxLatencyMs?: number;
            minQualityTier?: string;
            allowedProviders?: string[];
            blockedProviders?: string[];
        };
    }): Promise<RunRecordItem> {
        const body = {
            preference: payload.optimizationPreference || "cost",
            input: {
                messages: [{ role: "user", content: payload.prompt }],
            },
            ...(payload.taskType ? { taskType: payload.taskType } : {}),
            constraints: payload.constraints || {},
        };
        const res = await fetch("/api/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },

    async runPlayground(payload: {
        prompt: string;
        modelId?: string;
        taskType?: string;
        optimizationPreference?: string;
        constraints?: Record<string, unknown>;
    }): Promise<RunRecordItem> {
        const isSelected = Boolean(payload.modelId && payload.modelId !== "auto-router");
        const body = {
            selectionMode: isSelected ? "selected" : "automatic",
            ...(isSelected ? { modelId: payload.modelId } : {}),
            preference: payload.optimizationPreference || "cost",
            input: {
                messages: [{ role: "user", content: payload.prompt }],
            },
            ...(payload.taskType ? { taskType: payload.taskType } : {}),
            constraints: payload.constraints || {},
        };
        const res = await fetch("/api/playground/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return handleResponse(res);
    },

    async getRun(id: string): Promise<RunRecordItem> {
        const res = await fetch(`/api/runs/${encodeURIComponent(id)}`);
        return handleResponse(res);
    },

    async getUsage(params?: { since?: string; until?: string; provider?: string }): Promise<Record<string, unknown>> {
        const query = new URLSearchParams();
        if (params?.since) query.set("since", params.since);
        if (params?.until) query.set("until", params.until);
        if (params?.provider) query.set("provider", params.provider);
        const res = await fetch(`/api/usage?${query.toString()}`);
        return handleResponse(res);
    },

    async recommendTask(payload: { prompt: string; constraints?: Record<string, unknown> }): Promise<RecommendationSummaryItem> {
        const res = await fetch("/api/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return handleResponse(res);
    },

    async uploadDocument(formData: FormData): Promise<{
        documentId: string;
        filename: string;
        chunkCount: number;
        status: string;
        storageBackend: string;
    }> {
        const res = await fetch("/api/documents", {
            method: "POST",
            body: formData,
        });
        return handleResponse(res);
    },

    async askDocument(payload: { query: string; documentId?: string }): Promise<{
        answer: string;
        insufficientEvidence: boolean;
        sources: Array<{ documentId: string; chunkId: string; filename?: string }>;
        modelUsed: string;
    }> {
        const res = await fetch("/api/documents/qa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return handleResponse(res);
    },
};
