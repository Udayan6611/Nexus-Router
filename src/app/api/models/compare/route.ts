import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import { compareModelsRequestSchema } from "@/lib/catalogue/schemas";
import { compareModels } from "@/lib/catalogue/repository";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        let json: unknown;
        try {
            json = await request.json();
        } catch {
            throw new AppError("validation_failed", { message: "Invalid JSON body" });
        }
        const parsed = compareModelsRequestSchema.safeParse(json);
        if (!parsed.success) {
            throw parsed.error;
        }
        const comparison = await compareModels(parsed.data.modelIds);
        return NextResponse.json(successBody(comparison, requestId));
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
