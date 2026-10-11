import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { serializeError } from "@/lib/errors";
import { usageQuerySchema } from "@/lib/persistence/types";
import { fetchUsageSummary } from "@/lib/persistence/runs-repository";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parseResult = usageQuerySchema.safeParse(searchParams);
        if (!parseResult.success) {
            throw parseResult.error;
        }

        const summary = await fetchUsageSummary(parseResult.data);
        return NextResponse.json(successBody(summary, requestId));
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
