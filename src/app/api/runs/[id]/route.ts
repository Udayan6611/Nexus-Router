import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import { fetchRunById } from "@/lib/persistence/runs-repository";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        const { id } = await context.params;
        const fetched = await fetchRunById(id);
        if (!fetched) {
            throw new AppError("not_found", {
                message: `Run '${id}' was not found`,
            });
        }
        return NextResponse.json(
            successBody(
                {
                    ...fetched.run,
                    storageSource: fetched.source,
                },
                requestId,
            ),
        );
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
