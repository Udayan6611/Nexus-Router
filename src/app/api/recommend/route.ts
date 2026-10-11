import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import {
    understandTask,
    recommendModels,
    catalogueListToCandidates,
    filterRecommendationsByRouterEligibility,
} from "@/lib/ai";
import { listModels } from "@/lib/catalogue/repository";
import { z } from "zod";

const recommendRequestSchema = z.object({
    prompt: z.string().min(1, "Prompt cannot be empty"),
    constraints: z.object({
        maxCostUsd: z.number().positive().optional(),
        maxLatencyMs: z.number().int().positive().optional(),
        minQualityTier: z.enum(["budget", "balanced", "flagship"]).optional(),
        allowedProviders: z.array(z.string()).optional(),
        blockedProviders: z.array(z.string()).optional(),
    }).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        let json: unknown;
        try {
            json = await request.json();
        } catch {
            throw new AppError("validation_failed", { message: "Invalid JSON request body" });
        }

        const parsed = recommendRequestSchema.safeParse(json);
        if (!parsed.success) {
            throw parsed.error;
        }

        const { prompt, constraints } = parsed.data;

        // 1. Task understanding
        const taskResult = await understandTask(prompt);
        const requirements = taskResult.ok ? taskResult.data : {
            taskType: "general" as const,
            complexity: "medium" as const,
            optimization: "cost" as const,
            hardConstraints: [],
            inferredRequirements: [],
            summary: prompt.slice(0, 100),
        };

        // 2. Fetch catalogue models & convert to candidate structures
        const catalogueResponse = await listModels();
        const candidates = catalogueListToCandidates(catalogueResponse.items);

        // 3. Generate candidate recommendations
        const recResult = await recommendModels(requirements, candidates);
        if (!recResult.ok) {
            throw new AppError("internal_error", { message: recResult.error.message });
        }

        // 4. Filter by router eligibility if constraints exist
        const allEligibleIds = catalogueResponse.items.map((m) => m.id);
        const filteredRecommendations = filterRecommendationsByRouterEligibility(
            recResult.data,
            allEligibleIds,
        );

        return NextResponse.json(
            successBody(
                {
                    requirements,
                    recommendations: filteredRecommendations,
                    topRecommendation: filteredRecommendations[0] ?? null,
                },
                requestId,
            ),
        );
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
