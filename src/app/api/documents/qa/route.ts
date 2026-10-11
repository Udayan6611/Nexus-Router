import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import { retrieveKnowledge, answerFromDocument } from "@/lib/ai";
import { z } from "zod";

const qaRequestSchema = z.object({
    query: z.string().min(1, "Query is required"),
    documentId: z.string().optional(),
    limit: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        let json: unknown;
        try {
            json = await request.json();
        } catch {
            throw new AppError("validation_failed", { message: "Invalid JSON request body" });
        }

        const parsed = qaRequestSchema.safeParse(json);
        if (!parsed.success) {
            throw parsed.error;
        }

        const { query, documentId, limit } = parsed.data;
        const userId = request.headers.get("x-user-id") || "anonymous";
        const sessionId = request.headers.get("x-session-id") || undefined;

        // 1. Retrieve knowledge scoped to caller's identity
        const retrieveResult = await retrieveKnowledge(query, {
            userId,
            sessionId,
            documentId,
            limit: limit ?? 5,
        });

        if (!retrieveResult.ok) {
            throw new AppError("internal_error", {
                message: `Retrieval failed: ${retrieveResult.error.message}`,
            });
        }

        // 2. Generate grounded answer
        const answerResult = await answerFromDocument(query, retrieveResult.data);
        if (!answerResult.ok) {
            throw new AppError("internal_error", {
                message: `Answer generation failed: ${answerResult.error.message}`,
            });
        }

        return NextResponse.json(successBody(answerResult.data, requestId));
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
