import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import { routeExecutionRequestSchema } from "@/lib/orchestration/schemas";
import { orchestrateRun } from "@/lib/orchestration/orchestrator";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        let json: unknown;
        try {
            json = await request.json();
        } catch {
            throw new AppError("validation_failed", { message: "Invalid JSON request body" });
        }

        if (json && typeof json === "object") {
            const raw = json as Record<string, unknown>;
            if (!raw.input && typeof raw.prompt === "string") {
                json = {
                    ...raw,
                    preference: raw.preference || raw.optimizationPreference || "cost",
                    input: {
                        messages: [{ role: "user", content: raw.prompt }],
                    },
                };
            }
        }

        const parsed = routeExecutionRequestSchema.safeParse(json);
        if (!parsed.success) {
            throw parsed.error;
        }

        const runRecord = await orchestrateRun({
            request: parsed.data,
            requestId,
        });

        if (runRecord.status === "no_eligible_model") {
            return NextResponse.json(successBody(runRecord, requestId), { status: 422 });
        }

        return NextResponse.json(successBody(runRecord, requestId));
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
