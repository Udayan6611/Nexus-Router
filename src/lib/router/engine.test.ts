import { describe, expect, it } from "vitest";
import { routingDecisionSchema } from "@/lib/contracts/routing";
import { CANONICAL_MODELS } from "@/lib/catalogue/models";
import {
    evaluateCandidate,
    routeTask,
    validateFallback,
} from "./engine";

describe("Module 3: Deterministic Routing Engine", () => {
    const fixedTime = "2026-10-11T12:00:00Z";

    it("produces a valid selected decision conforming to routingDecisionSchema", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: {},
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        expect(decision.outcome).toBe("selected");
        const validation = routingDecisionSchema.safeParse(decision);
        expect(validation.success).toBe(true);
        if (decision.outcome === "selected") {
            expect(decision.selected.rank).toBe(1);
            expect(decision.fallbacks.length).toBeGreaterThan(0);
            expect(decision.fallbacks[0].rank).toBe(2);
        }
    });

    it("ranks cheapest model first when preference is cost", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: {},
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        if (decision.outcome === "selected") {
            expect(decision.selected.modelId).toBe("sim-basic-fast");
        }
    });

    it("ranks lowest latency model first when preference is latency", () => {
        const decision = routeTask(
            {
                preference: "latency",
                constraints: {},
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        if (decision.outcome === "selected") {
            expect(decision.selected.modelId).toBe("sim-basic-fast");
        }
    });

    it("ranks highest quality tier model first when preference is quality", () => {
        const decision = routeTask(
            {
                preference: "quality",
                constraints: {},
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        if (decision.outcome === "selected") {
            expect(decision.selected.modelId).toBe("sim-frontier-expert");
        }
    });

    it("enforces maxCostUsd and rejects models exceeding budget", () => {
        const decision = routeTask(
            {
                preference: "quality",
                constraints: { maxCostUsd: 0.0005 },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        expect(decision.outcome).toBe("selected");
        if (decision.outcome === "selected") {
            expect(decision.selected.estimatedCostUsd).toBeLessThanOrEqual(0.0005);
            const rejectedCost = decision.rejected.find((r) =>
                r.reasons.some((reason) => reason.code === "exceeds_max_cost"),
            );
            expect(rejectedCost).toBeDefined();
        }
    });

    it("enforces maxLatencyMs and rejects models exceeding latency limit", () => {
        const decision = routeTask(
            {
                preference: "quality",
                constraints: { maxLatencyMs: 200 },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        if (decision.outcome === "selected") {
            expect(decision.selected.estimatedLatencyMs).toBeLessThanOrEqual(200);
            const rejectedLat = decision.rejected.find((r) =>
                r.reasons.some((reason) => reason.code === "exceeds_max_latency"),
            );
            expect(rejectedLat).toBeDefined();
        }
    });

    it("enforces requiredCapabilities and rejects models lacking support", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: { requiredCapabilities: ["vision"] },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        expect(decision.outcome).toBe("selected");
        if (decision.outcome === "selected") {
            expect(decision.selected.modelId).toBe("sim-frontier-expert");
            const rejected = decision.rejected.filter((r) =>
                r.reasons.some((reason) => reason.code === "missing_capability"),
            );
            expect(rejected.length).toBeGreaterThanOrEqual(4);
        }
    });

    it("enforces minContextWindowTokens", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: { minContextWindowTokens: 150_000 },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        expect(decision.outcome).toBe("selected");
        if (decision.outcome === "selected") {
            expect(decision.selected.modelId).toBe("sim-frontier-expert");
            const rejectedCtx = decision.rejected.find((r) =>
                r.reasons.some((reason) => reason.code === "context_window_too_small"),
            );
            expect(rejectedCtx).toBeDefined();
        }
    });

    it("enforces minQualityTier", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: { minQualityTier: "advanced" },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        if (decision.outcome === "selected") {
            const rejected = decision.rejected.find((r) =>
                r.reasons.some((reason) => reason.code === "below_min_quality"),
            );
            expect(rejected).toBeDefined();
        }
    });

    it("enforces provider allowed and blocked lists", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: { blockedProviders: ["simulator"] },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        if (decision.outcome === "selected") {
            expect(decision.selected.provider).toBe("groq");
            const blocked = decision.rejected.filter((r) =>
                r.reasons.some((reason) => reason.code === "provider_blocked"),
            );
            expect(blocked.length).toBe(2);
        }
    });

    it("returns no_eligible_model when no model satisfies all constraints", () => {
        const decision = routeTask(
            {
                preference: "cost",
                constraints: {
                    maxCostUsd: 0.0000001,
                    minContextWindowTokens: 1_000_000,
                },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        expect(decision.outcome).toBe("no_eligible_model");
        const validation = routingDecisionSchema.safeParse(decision);
        expect(validation.success).toBe(true);
        if (decision.outcome === "no_eligible_model") {
            expect(decision.rejected.length).toBe(CANONICAL_MODELS.length);
            expect(decision.summary).toContain("All 5 considered model candidates were rejected");
        }
    });

    it("validates fallback candidate against remaining deadline", () => {
        const fastModel = CANONICAL_MODELS.find((m) => m.id === "sim-basic-fast")!;
        const slowModel = CANONICAL_MODELS.find((m) => m.id === "sim-frontier-expert")!;

        // 2000ms deadline: both eligible
        expect(validateFallback(fastModel, {}, 2000).eligible).toBe(true);
        expect(validateFallback(slowModel, {}, 2000).eligible).toBe(true);

        // 100ms deadline: slow model rejected with insufficient_deadline
        const fallbackCheck = validateFallback(slowModel, {}, 100);
        expect(fallbackCheck.eligible).toBe(false);
        expect(
            fallbackCheck.rejectionReasons?.some((r) => r.code === "insufficient_deadline"),
        ).toBe(true);
    });

    it("conservative handling rejects models with unknown metadata for required fields", () => {
        const modelWithUnknownPricing = {
            ...CANONICAL_MODELS[0],
            pricing: { status: "unknown" as const, reason: "not_published" as const },
        };

        const evaluation = evaluateCandidate(modelWithUnknownPricing, { maxCostUsd: 0.01 });
        expect(evaluation.status).toBe("rejected");
        if (evaluation.status === "rejected") {
            expect(evaluation.reasons.some((r) => r.code === "metadata_unknown")).toBe(true);
        }
    });

    it("advisory shortlist does not promote an ineligible model", () => {
        const decision = routeTask(
            {
                preference: "quality",
                constraints: { maxLatencyMs: 100 },
                advisory: {
                    source: "ai_advisory",
                    modelIds: ["sim-frontier-expert"],
                },
            },
            CANONICAL_MODELS,
            fixedTime,
        );

        // sim-frontier-expert has 950ms latency, exceeding 100ms. AI recommendation must not override it!
        if (decision.outcome === "selected") {
            expect(decision.selected.modelId).not.toBe("sim-frontier-expert");
        }
    });
});
