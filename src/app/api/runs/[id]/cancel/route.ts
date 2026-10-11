import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { serializeError } from "@/lib/errors";
import { requestRunCancellation } from "@/lib/orchestration/tracker";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        const { id } = await context.params;
        const result = requestRunCancellation(id);
        return NextResponse.json(
            successBody(
                {
                    runId: id,
                    status: result.status,
                    message: result.message,
                },
                requestId,
            ),
        );
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
