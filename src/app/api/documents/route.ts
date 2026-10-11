import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestIdentity } from "@/lib/ids";
import { successBody } from "@/lib/contracts/api";
import { AppError, serializeError } from "@/lib/errors";
import { extractDocument, ingestDocument, type DocumentInput } from "@/lib/ai";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const { requestId } = resolveRequestIdentity(request.headers);
    try {
        const contentType = request.headers.get("content-type") || "";
        const documentId = `doc_${crypto.randomUUID()}`;
        const userId = request.headers.get("x-user-id") || "anonymous";
        const sessionId = request.headers.get("x-session-id") || requestId;

        let input: DocumentInput;

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file");

            if (!file || typeof file === "string") {
                const text = formData.get("text");
                if (typeof text === "string" && text.trim().length > 0) {
                    input = {
                        mode: "text",
                        documentId,
                        userId,
                        sessionId,
                        text,
                        filename: (formData.get("filename") as string) || "pasted.txt",
                    };
                } else {
                    throw new AppError("validation_failed", { message: "No file or text payload provided in form data" });
                }
            } else {
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                input = {
                    mode: "file",
                    documentId,
                    userId,
                    sessionId,
                    filename: file.name,
                    mimeType: file.type || undefined,
                    bytes,
                };
            }
        } else {
            let json: Record<string, unknown>;
            try {
                json = (await request.json()) as Record<string, unknown>;
            } catch {
                throw new AppError("validation_failed", { message: "Invalid JSON or form data payload" });
            }

            if (!json.text || typeof json.text !== "string" || json.text.trim().length === 0) {
                throw new AppError("validation_failed", { message: "Document text content is required" });
            }

            input = {
                mode: "text",
                documentId,
                userId,
                sessionId,
                text: json.text,
                format: json.format === "markdown" ? "markdown" : "text",
                filename: typeof json.filename === "string" ? json.filename : "document.txt",
            };
        }

        // 1. Extract document
        const extractResult = await extractDocument(input);
        if (!extractResult.ok) {
            throw new AppError("validation_failed", {
                message: `Document extraction failed: [${extractResult.error.code}] ${extractResult.error.message}`,
            });
        }

        const extractedDoc = extractResult.data;

        // 2. Ingest document chunks into persistent knowledge repository
        const ingestResult = await ingestDocument(extractedDoc);
        if (!ingestResult.ok) {
            throw new AppError("internal_error", {
                message: `Document ingestion failed: [${ingestResult.error.code}] ${ingestResult.error.message}`,
            });
        }

        return NextResponse.json(
            successBody(
                {
                    documentId: extractedDoc.documentId,
                    filename: extractedDoc.filename || "document",
                    sourceType: extractedDoc.sourceType,
                    pageCount: extractedDoc.pageCount,
                    chunkCount: extractedDoc.chunks.length,
                    storageBackend: ingestResult.data.storageBackend,
                    status: "success",
                },
                requestId,
            ),
        );
    } catch (error) {
        const { status, body } = serializeError(error, requestId);
        return NextResponse.json(body, { status });
    }
}
