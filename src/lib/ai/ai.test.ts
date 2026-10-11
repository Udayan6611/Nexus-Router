import { describe, expect, it } from "vitest";
import {
    catalogueListToCandidates,
    catalogueToCandidate,
    extractExplicitConstraintsFromAi,
    filterRecommendationsByRouterEligibility,
    mapAiComplexityToBackend,
    mapAiOptimizationToBackend,
    mapAiRequirementsToBackendRouting,
    mapAiTaskTypeToBackend,
    type AiTaskRequirements,
    type ExplicitUserConstraint,
    type InferredUserRequirement,
    type ModelCandidate,
} from "@/lib/ai/contracts";
import {
    evidenceInInput,
    matchKey,
    parseProviderJson,
} from "@/lib/ai/task-understanding/normalize";
import { preprocessInput } from "@/lib/ai/task-understanding/preprocess";
import { ProviderError, type TaskProvider } from "@/lib/ai/task-understanding/provider";
import { understandTask } from "@/lib/ai/task-understanding/understandTask";
import {
    recommendModels,
    recommendModelsWithDiagnostics,
} from "@/lib/ai/model-recommendation/recommendModels";
import { evaluateCandidate } from "@/lib/ai/model-recommendation/evaluateCandidate";
import { rankCandidates } from "@/lib/ai/model-recommendation/rankCandidates";
import { CANONICAL_MODELS } from "@/lib/catalogue/models";
import { routeTask } from "@/lib/router/engine";

describe("AI Subsystem: Type Mappings & Contracts", () => {
    it("maps AI task types to canonical backend TaskType", () => {
        expect(mapAiTaskTypeToBackend("coding")).toBe("code");
        expect(mapAiTaskTypeToBackend("reasoning")).toBe("reasoning");
        expect(mapAiTaskTypeToBackend("summarization")).toBe("summarization");
        expect(mapAiTaskTypeToBackend("document_analysis")).toBe("extraction");
        expect(mapAiTaskTypeToBackend("multimodal")).toBe("other");
        expect(mapAiTaskTypeToBackend("general")).toBe("general_chat");
    });

    it("maps AI optimization preferences to canonical backend OptimizationPreference", () => {
        expect(mapAiOptimizationToBackend("cost")).toBe("cost");
        expect(mapAiOptimizationToBackend("latency")).toBe("latency");
        expect(mapAiOptimizationToBackend("quality")).toBe("quality");
        // Non-standard friend preferences safely default to "cost"
        expect(mapAiOptimizationToBackend("balanced")).toBe("cost");
        expect(mapAiOptimizationToBackend("unspecified")).toBe("cost");
    });

    it("maps AI complexity levels conservatively", () => {
        expect(mapAiComplexityToBackend("low")).toBe("low");
        expect(mapAiComplexityToBackend("medium")).toBe("medium");
        expect(mapAiComplexityToBackend("high")).toBe("high");
        // Unknown complexity is conservatively elevated to "high"
        expect(mapAiComplexityToBackend("unknown")).toBe("high");
    });

    it("extracts hard constraints ONLY from explicit user statements with evidence", () => {
        const explicit: ExplicitUserConstraint[] = [
            {
                provenance: "explicit",
                text: "Budget must be under $0.005",
                evidence: "under $0.005",
            },
            {
                provenance: "explicit",
                text: "Latency must be under 200ms",
                evidence: "under 200ms",
            },
            {
                provenance: "explicit",
                text: "Must support tool_use and vision",
                evidence: "tool_use and vision",
            },
            {
                provenance: "explicit",
                text: "Only use groq",
                evidence: "Only use groq",
            },
        ];

        const constraints = extractExplicitConstraintsFromAi(explicit);
        expect(constraints.maxCostUsd).toBe(0.005);
        expect(constraints.maxLatencyMs).toBe(200);
        expect(constraints.requiredCapabilities).toContain("tool_use");
        expect(constraints.requiredCapabilities).toContain("vision");
        expect(constraints.allowedProviders).toEqual(["groq"]);
    });

    it("never promotes inferred requirements into hard router constraints", () => {
        const explicit: ExplicitUserConstraint[] = [
            {
                provenance: "explicit",
                text: "Max cost under $0.01",
                evidence: "under $0.01",
            },
        ];
        const inferred: InferredUserRequirement[] = [
            {
                provenance: "inferred",
                text: "Should have low latency under 50ms and high quality tier",
                confidence: 0.8,
                rationale: "Inferred from fast interactive request",
            },
        ];

        const req: AiTaskRequirements = {
            taskType: "coding",
            complexity: "medium",
            optimization: "cost",
            explicitConstraints: explicit,
            inferredRequirements: inferred,
            uncertainty: { score: 0.1, clarificationNeeded: false, reasons: [] },
            summary: "Write a function",
        };

        const mapped = mapAiRequirementsToBackendRouting(req);
        expect(mapped.taskType).toBe("code");
        expect(mapped.preference).toBe("cost");
        expect(mapped.constraints.maxCostUsd).toBe(0.01);
        // Inferred requirements are NOT in constraints
        expect(mapped.constraints.maxLatencyMs).toBeUndefined();
        expect(mapped.constraints.minQualityTier).toBeUndefined();
    });
});

describe("AI Subsystem: Catalogue Adapter", () => {
    it("preserves exact canonical model IDs and transforms metadata", () => {
        const candidates = catalogueListToCandidates(CANONICAL_MODELS);
        expect(candidates.length).toBe(CANONICAL_MODELS.length);

        const llama = candidates.find((c) => c.id === "llama-3.3-70b-versatile");
        expect(llama).toBeDefined();
        expect(llama?.provider).toBe("groq");
        expect(llama?.qualityTier).toBe("advanced");
        expect(llama?.contextWindowTokens).toBe(128_000);
        expect(llama?.pricing?.inputPerMTokUsd).toBe(0.59);
        expect(llama?.latency?.medianMs).toBe(350);

        const simBasic = candidates.find((c) => c.id === "sim-basic-fast");
        expect(simBasic).toBeDefined();
        expect(simBasic?.id).toBe("sim-basic-fast");
        expect(simBasic?.provider).toBe("simulator");
        expect(simBasic?.qualityTier).toBe("basic");
    });

    it("marks unknown/stale dimensions in knownLimitations", () => {
        const raw = CANONICAL_MODELS[0]!;
        const candidate = catalogueToCandidate(raw);
        expect(candidate.id).toBe(raw.id);
        expect(Array.isArray(candidate.knownLimitations)).toBe(true);
    });
});

describe("AI Subsystem: Task Understanding (Mocked Providers)", () => {
    it("successfully parses valid AI output from mock provider", async () => {
        const mockProvider: TaskProvider = async () =>
            JSON.stringify({
                taskType: "coding",
                complexity: "medium",
                optimization: "cost",
                optimizationEvidence: "make it cheap",
                explicitConstraints: [
                    { text: "Must use Python", evidence: "Must use Python" },
                ],
                inferredRequirements: [
                    { text: "Use type hints", confidence: 0.8, rationale: "Standard Python 3" },
                ],
                uncertainty: { score: 0.1, clarificationNeeded: false, reasons: [] },
                summary: "Create a Python script on a budget.",
            });

        const result = await understandTask(
            { prompt: "Write a script, make it cheap. Must use Python.", source: "typed" },
            { provider: mockProvider },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.taskType).toBe("coding");
            expect(result.data.complexity).toBe("medium");
            expect(result.data.optimization).toBe("cost");
            expect(result.data.explicitConstraints.length).toBe(1);
            expect(result.data.explicitConstraints[0]?.text).toBe("Must use Python");
            expect(result.data.inferredRequirements.length).toBe(1);
        }
    });

    it("demotes explicit constraint if evidence is not in prompt", async () => {
        const mockProvider: TaskProvider = async () =>
            JSON.stringify({
                taskType: "general",
                complexity: "low",
                optimization: "unspecified",
                optimizationEvidence: null,
                explicitConstraints: [
                    { text: "Must respond in French", evidence: "respond in French" }, // Not in prompt!
                ],
                inferredRequirements: [],
                uncertainty: { score: 0.2, clarificationNeeded: false, reasons: [] },
                summary: "Hello task.",
            });

        const result = await understandTask(
            { prompt: "Hello world, what is the time?", source: "typed" },
            { provider: mockProvider },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            // Demoted from explicit to inferred!
            expect(result.data.explicitConstraints.length).toBe(0);
            expect(result.data.inferredRequirements.length).toBe(1);
            expect(result.data.inferredRequirements[0]?.provenance).toBe("inferred");
            expect(result.data.inferredRequirements[0]?.confidence).toBe(0.3);
        }
    });

    it("demotes all explicit constraints if source is document", async () => {
        const mockProvider: TaskProvider = async () =>
            JSON.stringify({
                taskType: "summarization",
                complexity: "medium",
                optimization: "unspecified",
                optimizationEvidence: null,
                explicitConstraints: [
                    { text: "Must adhere to RFC 2119", evidence: "RFC 2119" },
                ],
                inferredRequirements: [],
                uncertainty: { score: 0.2, clarificationNeeded: false, reasons: [] },
                summary: "Document summary.",
            });

        const result = await understandTask(
            { prompt: "RFC 2119 requires that...", source: "document" },
            { provider: mockProvider },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.explicitConstraints.length).toBe(0);
            expect(result.data.inferredRequirements.length).toBe(1);
        }
    });

    it("falls back safely when provider times out", async () => {
        const timingOutProvider: TaskProvider = async () => {
            throw new ProviderError("timeout", "Network timeout occurred");
        };

        const result = await understandTask(
            { prompt: "Analyze this quickly. Must not use simulator.", source: "typed" },
            { provider: timingOutProvider },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.taskType).toBe("general");
            expect(result.data.complexity).toBe("unknown");
            expect(result.data.uncertainty.score).toBe(0.9);
            // Conservative verbatim constraint extractor catches obligation
            expect(result.data.explicitConstraints.length).toBeGreaterThanOrEqual(1);
            expect(result.data.explicitConstraints[0]?.text).toContain("Must not use simulator");
        }
    });

    it("falls back safely on invalid/malformed LLM JSON", async () => {
        const malformedProvider: TaskProvider = async () => "Not valid JSON at all!";

        const result = await understandTask(
            { prompt: "General query", source: "typed" },
            { provider: malformedProvider },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.summary).toBe("Task could not be analyzed automatically.");
            expect(result.data.uncertainty.reasons[0]).toContain("malformed_output");
        }
    });

    it("rejects empty prompt and oversized input", () => {
        const emptyResult = preprocessInput({ prompt: "   ", source: "typed" }, { maxInputChars: 100 });
        expect(emptyResult.ok).toBe(false);
        if (!emptyResult.ok) expect(emptyResult.error.code).toBe("EMPTY_INPUT");

        const longResult = preprocessInput(
            { prompt: "x".repeat(150), source: "typed" },
            { maxInputChars: 100 },
        );
        expect(longResult.ok).toBe(false);
        if (!longResult.ok) expect(longResult.error.code).toBe("INPUT_TOO_LONG");
    });

    it("handles tolerant JSON parsing and evidence verification", () => {
        expect(parseProviderJson('```json\n{"foo":"bar"}\n```')).toEqual({ foo: "bar" });
        expect(parseProviderJson("Prefix text {\"answer\":42} postfix")).toEqual({ answer: 42 });
        expect(parseProviderJson("not json")).toBeUndefined();

        expect(matchKey("  Hello   World!  ")).toBe("hello world!");
        expect(evidenceInInput("must use python", "You must use Python for this task")).toBe(true);
        expect(evidenceInInput("javascript", "You must use Python for this task")).toBe(false);
    });

    it("evaluates candidates directly and ranks them deterministically", () => {
        const candidate: ModelCandidate = {
            id: "test-model",
            supportedTaskTypes: ["coding"],
            pricing: { inputPerMTokUsd: 0.1, outputPerMTokUsd: 0.2 },
            latency: { medianMs: 200 },
            qualityTier: "standard",
        };
        const evaluation = evaluateCandidate(
            {
                taskType: "coding",
                complexity: "low",
                optimization: "cost",
                explicitConstraints: [],
                inferredRequirements: [],
                uncertainty: { score: 0, clarificationNeeded: false, reasons: [] },
                summary: "Coding test",
            },
            candidate,
        );
        expect(evaluation.recommendable).toBe(true);
        expect(evaluation.taskFit).toBe("supported");

        const ranking = rankCandidates([evaluation], "cost");
        expect(ranking.ranked.length).toBe(1);
        expect(ranking.ranked[0]?.evaluation.facts.id).toBe("test-model");
    });
});

describe("AI Subsystem: Model Recommendation & Router Authority", () => {
    const sampleCandidates: ModelCandidate[] = [
        {
            id: "llama-3.1-8b-instant",
            displayName: "Llama 3.1 8B Instant",
            provider: "groq",
            supportedTaskTypes: ["general", "coding", "summarization"],
            pricing: { inputPerMTokUsd: 0.05, outputPerMTokUsd: 0.08 },
            latency: { medianMs: 140 },
            qualityTier: "standard",
        },
        {
            id: "llama-3.3-70b-versatile",
            displayName: "Llama 3.3 70B Versatile",
            provider: "groq",
            supportedTaskTypes: ["general", "coding", "reasoning"],
            pricing: { inputPerMTokUsd: 0.59, outputPerMTokUsd: 0.79 },
            latency: { medianMs: 350 },
            qualityTier: "advanced",
        },
    ];

    it("returns empty recommendations without error when candidate list is empty", async () => {
        const req: AiTaskRequirements = {
            taskType: "coding",
            complexity: "low",
            optimization: "cost",
            explicitConstraints: [],
            inferredRequirements: [],
            uncertainty: { score: 0, clarificationNeeded: false, reasons: [] },
            summary: "Code task",
        };

        const res = await recommendModelsWithDiagnostics(req, []);
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.recommendations).toEqual([]);
            expect(res.data.emptyReason).toBe("No candidates were supplied.");
        }
    });

    it("detects and rejects duplicate candidate IDs", async () => {
        const req: AiTaskRequirements = {
            taskType: "coding",
            complexity: "low",
            optimization: "cost",
            explicitConstraints: [],
            inferredRequirements: [],
            uncertainty: { score: 0, clarificationNeeded: false, reasons: [] },
            summary: "Code task",
        };

        const dupes = [sampleCandidates[0]!, sampleCandidates[0]!];
        const res = await recommendModels(req, dupes);
        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.error.code).toBe("DUPLICATE_CANDIDATE_ID");
        }
    });

    it("ranks candidates according to optimization preference and explains choices", async () => {
        const req: AiTaskRequirements = {
            taskType: "coding",
            complexity: "low",
            optimization: "cost",
            explicitConstraints: [],
            inferredRequirements: [],
            uncertainty: { score: 0, clarificationNeeded: false, reasons: [] },
            summary: "Write a small script cheaply",
        };

        const res = await recommendModels(req, sampleCandidates);
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.data.length).toBe(2);
            // Rank 1 should be the cheaper model
            expect(res.data[0]?.modelId).toBe("llama-3.1-8b-instant");
            expect(res.data[0]?.rank).toBe(1);
            expect(res.data[0]?.reasons.length).toBeGreaterThan(0);
            expect(res.data[0]?.limitations).toContain(
                "This is a recommendation only; final eligibility and routing are decided by the deterministic router.",
            );
        }
    });

    it("router authority strictly overrides AI recommendation if hard constraints fail", () => {
        // AI recommended llama-3.3-70b-versatile
        const recommendations = [{ modelId: "llama-3.3-70b-versatile" }];

        // Deterministic Router runs with a strict maximum cost constraint that excludes llama-3.3-70b
        // (Llama 3.3 70B input: $0.59 / 1M tokens -> 1000 tokens ≈ $0.00059. maxCostUsd = 0.0001)
        const routerDecision = routeTask(
            {
                preference: "cost",
                constraints: {
                    maxCostUsd: 0.0001, // Budget too low for Llama 3.3 70B
                },
            },
            CANONICAL_MODELS,
        );

        // The router rejects llama-3.3-70b-versatile due to max_cost_exceeded
        const llamaRejection = routerDecision.rejected.find(
            (r) => r.modelId === "llama-3.3-70b-versatile",
        );
        expect(llamaRejection).toBeDefined();
        expect(llamaRejection?.reasons.some((r) => r.code === "exceeds_max_cost")).toBe(true);

        // The router chose sim-basic-fast or llama-3.1-8b-instant
        expect(routerDecision.outcome).toBe("selected");
        if (routerDecision.outcome === "selected") {
            expect(routerDecision.selected.modelId).not.toBe("llama-3.3-70b-versatile");
        }

        // Filtering AI recommendations against eligible router candidates cleanly removes the ineligible model
        const eligibleIds =
            routerDecision.outcome === "selected"
                ? [routerDecision.selected.modelId, ...routerDecision.fallbacks.map((f) => f.modelId)]
                : [];
        const validatedRecommendations = filterRecommendationsByRouterEligibility(
            recommendations,
            eligibleIds,
        );
        expect(validatedRecommendations.length).toBe(0);
    });
});
