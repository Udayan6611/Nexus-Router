import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import { getModelById } from "@/lib/catalogue/repository";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        const { id } = await context.params;
        const model = await getModelById(id);
        if (!model) {
            throw new AppError("not_found", {
                message: `Model '${id}' was not found in the catalogue`,
            });
        }
        return NextResponse.json(successBody(model, requestId));
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
