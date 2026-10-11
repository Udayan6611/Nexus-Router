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
