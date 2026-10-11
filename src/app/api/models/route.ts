import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { serializeError } from "@/lib/errors";
import { modelsQuerySchema } from "@/lib/catalogue/schemas";
import { listModels } from "@/lib/catalogue/repository";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parseResult = modelsQuerySchema.safeParse(searchParams);
        if (!parseResult.success) {
            throw parseResult.error;
        }
        const data = await listModels(parseResult.data);
        return NextResponse.json(successBody(data, requestId));
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
