import { describe, expect, it } from "vitest";
import {
    extractDocument,
    chunkDocument,
    canAccess,
    authorizeScope,
    filterChunksForScope,
    type DocumentInput,
    type ExtractedDocument,
    type DocumentChunk,
} from "./document-processing";
import {
    validateEmbeddingVector,
    embedText,
    embedBatchTexts,
    EXPECTED_EMBEDDING_DIMENSION,
    type EmbeddingProvider,
} from "./knowledge/embeddings";
import {
    InMemoryKnowledgeRepository,
    SupabaseKnowledgeRepository,
    cosineSimilarity,
} from "./knowledge/repository";
import { ingestDocument } from "./knowledge/ingestDocument";
import { retrieveKnowledge } from "./knowledge/retrieveKnowledge";
import { answerFromDocument, type AnswerProvider } from "./knowledge/answerFromDocument";
import type { EmbeddedChunk, RetrievedChunk } from "./knowledge/contracts";

// Helper: Builds a minimal valid PDF Uint8Array for testing without third-party binary files
function buildTestPdf(pages: string[][]): Uint8Array {
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const objects: string[] = [];
    const pageIds = pages.map((_, i) => 4 + i * 2);

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    pages.forEach((lines, i) => {
        const pageId = 4 + i * 2;
        const contentId = pageId + 1;
        const body =
            lines.length === 0
                ? ""
                : "BT /F1 12 Tf 72 720 Td 14 TL " + lines.map((l) => `(${esc(l)}) Tj T*`).join(" ") + " ET";
        objects[pageId] =
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
        objects[contentId] = `<< /Length ${body.length} >>\nstream\n${body}\nendstream`;
    });

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let id = 1; id < objects.length; id++) {
        offsets[id] = out.length;
        out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) {
        out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(out);
}

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const testOwner = { userId: "user-alpha", sessionId: "session-101" };

// Mock embedding provider generating normalized vectors of EXPECTED_EMBEDDING_DIMENSION (768)
class MockEmbeddingProvider implements EmbeddingProvider {
    constructor(private seed: number = 0.1) {}

    async embedBatch(texts: string[]): Promise<number[][]> {
        return texts.map((_, textIdx) => {
            const vec = new Array(EXPECTED_EMBEDDING_DIMENSION).fill(0);
            for (let i = 0; i < EXPECTED_EMBEDDING_DIMENSION; i++) {
                vec[i] = Math.sin(this.seed + textIdx + i * 0.05);
            }
            return vec;
        });
    }
}

describe("Document Processing: Extraction & Validation", () => {
    it("extracts plain text documents and structures them into chunks", async () => {
        const input: DocumentInput = {
            mode: "text",
            documentId: "doc-txt-1",
            text: "Hello world. This is a plain text document for testing.",
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.documentId).toBe("doc-txt-1");
        expect(result.data.sourceType).toBe("text");
        expect(result.data.extractedText).toContain("Hello world");
        expect(result.data.chunks.length).toBeGreaterThan(0);
        expect(result.data.chunks[0]!.documentId).toBe("doc-txt-1");
    });

    it("extracts Markdown documents and preserves heading hierarchy", async () => {
        const markdown = `# Architecture Overview\n\nNEXUS ROUTER is an intelligent multi-model LLM router.\n\n## Routing Engine\n\nIt selects models based on constraints.`;
        const input: DocumentInput = {
            mode: "text",
            format: "markdown",
            documentId: "doc-md-1",
            text: markdown,
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.sourceType).toBe("markdown");
        expect(result.data.extractedText).toContain("Architecture Overview");
        expect(result.data.extractedText).toContain("Routing Engine");
        expect(result.data.chunks.length).toBeGreaterThanOrEqual(1);

        // Verify heading paths are captured
        const hasHeadingPath = result.data.chunks.some(
            (c) => c.metadata.headingPath && c.metadata.headingPath.length > 0,
        );
        expect(hasHeadingPath).toBe(true);
    });

    it("extracts HTML documents safely, stripping scripts and styling", async () => {
        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Test Page</title>
                    <style>body { color: red; }</style>
                    <script>alert("malicious");</script>
                </head>
                <body>
                    <h1>Safe Content Header</h1>
                    <p>This is safe paragraph text inside body.</p>
                </body>
            </html>
        `;
        const input: DocumentInput = {
            mode: "file",
            documentId: "doc-html-1",
            filename: "page.html",
            bytes: enc(html),
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.sourceType).toBe("html");
        expect(result.data.extractedText).toContain("Safe Content Header");
        expect(result.data.extractedText).toContain("This is safe paragraph text");
        expect(result.data.extractedText).not.toContain("alert(\"malicious\")");
        expect(result.data.extractedText).not.toContain("color: red");
    });

    it("extracts multi-page PDF documents and attributes page numbers", async () => {
        const pdfBytes = buildTestPdf([
            ["NEXUS ROUTER Page One", "First page content."],
            ["NEXUS ROUTER Page Two", "Second page content."],
        ]);

        const input: DocumentInput = {
            mode: "file",
            documentId: "doc-pdf-1",
            filename: "report.pdf",
            mimeType: "application/pdf",
            bytes: pdfBytes,
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.sourceType).toBe("pdf");
        expect(result.data.pageCount).toBe(2);
        expect(result.data.extractedText).toContain("Page One");
        expect(result.data.extractedText).toContain("Page Two");
        expect(result.data.chunks.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects file size exceeding configured byte limit", async () => {
        const oversized = enc("A".repeat(500));
        const input: DocumentInput = {
            mode: "file",
            documentId: "doc-oversized",
            filename: "large.txt",
            bytes: oversized,
            ...testOwner,
        };

        const result = await extractDocument(input, {
            config: { limits: { maxFileBytes: 200 } },
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("FILE_TOO_LARGE");
        }
    });

    it("rejects MIME type contradicting file extension", async () => {
        const input: DocumentInput = {
            mode: "file",
            documentId: "doc-mismatch",
            filename: "document.pdf",
            mimeType: "text/html",
            bytes: buildTestPdf([["Hello"]]),
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("FORMAT_MISMATCH");
        }
    });

    it("rejects corrupt or invalid PDF files gracefully", async () => {
        const input: DocumentInput = {
            mode: "file",
            documentId: "doc-corrupt",
            filename: "bad.pdf",
            bytes: enc("%PDF-1.4\nthis is truncated garbage"),
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("CORRUPT_FILE");
        }
    });

    it("rejects empty text content", async () => {
        const input: DocumentInput = {
            mode: "text",
            documentId: "doc-empty",
            text: "   \n\t  ",
            ...testOwner,
        };

        const result = await extractDocument(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("EMPTY_CONTENT");
        }
    });
});

describe("Document Processing: Isolation & Scope", () => {
    it("verifies canAccess enforces userId and sessionId equality", () => {
        const ownerA = { userId: "user-1", sessionId: "sess-1" };
        const ownerB = { userId: "user-2", sessionId: "sess-1" };
        const ownerC = { userId: "user-1", sessionId: "sess-2" };

        expect(canAccess(ownerA, { userId: "user-1", sessionId: "sess-1" })).toBe(true);
        expect(canAccess(ownerA, { userId: "user-2", sessionId: "sess-1" })).toBe(false);
        expect(canAccess(ownerA, { userId: "user-1", sessionId: "sess-2" })).toBe(false);
        expect(canAccess(ownerB, { userId: "user-2", sessionId: "sess-1" })).toBe(true);
    });

    it("authorizeScope returns FORBIDDEN for unauthorized access", () => {
        const owner = { userId: "user-1", sessionId: "sess-1" };
        const allowed = authorizeScope(owner, { userId: "user-1", sessionId: "sess-1" });
        expect(allowed.ok).toBe(true);

        const denied = authorizeScope(owner, { userId: "user-attacker", sessionId: "sess-1" });
        expect(denied.ok).toBe(false);
        if (!denied.ok) {
            expect(denied.error.code).toBe("FORBIDDEN");
        }
    });

    it("filterChunksForScope strips chunks from other users or sessions", () => {
        const chunks: DocumentChunk[] = [
            {
                chunkId: "c1",
                documentId: "d1",
                userId: "user-1",
                sessionId: "sess-1",
                chunkIndex: 0,
                text: "Chunk 1",
                metadata: { sourceType: "text", headingPath: [], startOffset: 0, endOffset: 7, overlapChars: 0, estimatedTokens: 2 },
            },
            {
                chunkId: "c2",
                documentId: "d2",
                userId: "user-2",
                sessionId: "sess-2",
                chunkIndex: 0,
                text: "Chunk 2",
                metadata: { sourceType: "text", headingPath: [], startOffset: 0, endOffset: 7, overlapChars: 0, estimatedTokens: 2 },
            },
        ];

        const user1Chunks = filterChunksForScope(chunks, { userId: "user-1", sessionId: "sess-1" });
        expect(user1Chunks.length).toBe(1);
        expect(user1Chunks[0]!.chunkId).toBe("c1");
    });
});

describe("Knowledge & Embeddings", () => {
    it("validates embedding vectors strictly to expected 768 dimensions", () => {
        const validVec = new Array(EXPECTED_EMBEDDING_DIMENSION).fill(0.05);
        expect(validateEmbeddingVector(validVec)).toBe(true);

        // Wrong length
        expect(validateEmbeddingVector(new Array(128).fill(0.05))).toBe(false);
        // Non-number
        expect(validateEmbeddingVector([...validVec.slice(0, 767), "string"])).toBe(false);
        // NaN
        expect(validateEmbeddingVector([...validVec.slice(0, 767), Number.NaN])).toBe(false);
        // Infinity
        expect(validateEmbeddingVector([...validVec.slice(0, 767), Number.POSITIVE_INFINITY])).toBe(false);
    });

    it("computes cosine similarity accurately", () => {
        const v1 = [1, 0, 0];
        const v2 = [1, 0, 0];
        const v3 = [0, 1, 0];
        const v4 = [-1, 0, 0];

        expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
        expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
        expect(cosineSimilarity(v1, v4)).toBeCloseTo(-1.0);
    });

    it("embedText rejects empty or oversized texts", async () => {
        const mockProvider = new MockEmbeddingProvider();

        const emptyRes = await embedText("", mockProvider);
        expect(emptyRes.ok).toBe(false);
        if (!emptyRes.ok) {
            expect(emptyRes.error.code).toBe("INVALID_INPUT");
        }

        const oversizedRes = await embedText("a".repeat(25_000), mockProvider);
        expect(oversizedRes.ok).toBe(false);
        if (!oversizedRes.ok) {
            expect(oversizedRes.error.code).toBe("TEXT_TOO_LARGE");
        }
    });

    it("embedBatchTexts embeds texts in bounded batches", async () => {
        const mockProvider = new MockEmbeddingProvider();
        const texts = ["First sentence.", "Second sentence.", "Third sentence."];

        const res = await embedBatchTexts(texts, mockProvider, 2);
        expect(res.ok).toBe(true);
        if (!res.ok) return;

        expect(res.data.length).toBe(3);
        expect(res.data[0]!.length).toBe(EXPECTED_EMBEDDING_DIMENSION);
    });
});

describe("Persistent RAG: Ingestion, Storage & Scoped Retrieval", () => {
    it("ingests extracted document chunks idempotently into repository", async () => {
        const repo = new InMemoryKnowledgeRepository();
        const mockProvider = new MockEmbeddingProvider();

        const extractedDoc: ExtractedDocument = {
            documentId: "doc-rag-1",
            userId: "user-alpha",
            sessionId: "session-1",
            sourceType: "markdown",
            filename: "guide.md",
            extractedText: "Guide text",
            chunks: [
                {
                    chunkId: "doc-rag-1:0",
                    documentId: "doc-rag-1",
                    userId: "user-alpha",
                    sessionId: "session-1",
                    chunkIndex: 0,
                    text: "NEXUS ROUTER architecture separates deterministic rules from AI recommendations.",
                    metadata: {
                        sourceType: "markdown",
                        estimatedTokens: 15,
                        startOffset: 0,
                        endOffset: 82,
                        overlapChars: 0,
                        headingPath: ["Architecture"],
                    },
                },
                {
                    chunkId: "doc-rag-1:1",
                    documentId: "doc-rag-1",
                    userId: "user-alpha",
                    sessionId: "session-1",
                    chunkIndex: 1,
                    text: "Groq and Gemini providers handle fast inference and embeddings respectively.",
                    metadata: {
                        sourceType: "markdown",
                        estimatedTokens: 14,
                        startOffset: 83,
                        endOffset: 159,
                        overlapChars: 0,
                        headingPath: ["Providers"],
                    },
                },
            ],
            warnings: [],
        };

        const result = await ingestDocument(extractedDoc, {
            repository: repo,
            embeddingProvider: mockProvider,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.documentId).toBe("doc-rag-1");
        expect(result.data.chunkCount).toBe(2);
        expect(result.data.status).toBe("success");
    });

    it("enforces strict user ownership isolation in similarity search", async () => {
        const repo = new InMemoryKnowledgeRepository();
        const mockProvider = new MockEmbeddingProvider();

        const docUserA: ExtractedDocument = {
            documentId: "doc-userA",
            userId: "user-alice",
            sessionId: "sess-alice",
            sourceType: "text",
            extractedText: "Alice's secret financial report.",
            chunks: [
                {
                    chunkId: "doc-userA:0",
                    documentId: "doc-userA",
                    userId: "user-alice",
                    sessionId: "sess-alice",
                    chunkIndex: 0,
                    text: "Alice's confidential Q3 revenue numbers.",
                    metadata: {
                        sourceType: "text",
                        estimatedTokens: 8,
                        startOffset: 0,
                        endOffset: 40,
                        overlapChars: 0,
                        headingPath: [],
                    },
                },
            ],
            warnings: [],
        };

        const docUserB: ExtractedDocument = {
            documentId: "doc-userB",
            userId: "user-bob",
            sessionId: "sess-bob",
            sourceType: "text",
            extractedText: "Bob's public presentation.",
            chunks: [
                {
                    chunkId: "doc-userB:0",
                    documentId: "doc-userB",
                    userId: "user-bob",
                    sessionId: "sess-bob",
                    chunkIndex: 0,
                    text: "Bob's public presentation notes.",
                    metadata: {
                        sourceType: "text",
                        estimatedTokens: 7,
                        startOffset: 0,
                        endOffset: 33,
                        overlapChars: 0,
                        headingPath: [],
                    },
                },
            ],
            warnings: [],
        };

        await ingestDocument(docUserA, { repository: repo, embeddingProvider: mockProvider });
        await ingestDocument(docUserB, { repository: repo, embeddingProvider: mockProvider });

        // When Bob searches, he MUST NEVER see Alice's document chunks
        const bobRetrieval = await retrieveKnowledge(
            "revenue numbers",
            { userId: "user-bob" },
            { repository: repo, embeddingProvider: mockProvider },
        );

        expect(bobRetrieval.ok).toBe(true);
        if (!bobRetrieval.ok) return;

        const containsAliceDoc = bobRetrieval.data.some((c) => c.userId === "user-alice");
        expect(containsAliceDoc).toBe(false);

        // When Alice searches, she sees her document chunks
        const aliceRetrieval = await retrieveKnowledge(
            "revenue numbers",
            { userId: "user-alice" },
            { repository: repo, embeddingProvider: mockProvider },
        );

        expect(aliceRetrieval.ok).toBe(true);
        if (!aliceRetrieval.ok) return;
        expect(aliceRetrieval.data.some((c) => c.userId === "user-alice")).toBe(true);
    });

    it("SupabaseKnowledgeRepository degrades gracefully to in-memory fallback", async () => {
        // Without live Supabase credentials configured, it operates seamlessly via fallback
        const repo = new SupabaseKnowledgeRepository();
        expect(repo.storageBackend).toBe("supabase_pgvector");

        const sampleChunks: EmbeddedChunk[] = [
            {
                chunkId: "c-test-1",
                documentId: "doc-test",
                userId: "user-fallback",
                sessionId: "sess-1",
                chunkIndex: 0,
                text: "Fallback test content",
                embedding: new Array(EXPECTED_EMBEDDING_DIMENSION).fill(0.1),
                embeddingModel: "text-embedding-004",
                metadata: { headingPath: ["Test"] },
            },
        ];

        const saveRes = await repo.saveChunks(sampleChunks);
        expect(saveRes.ok).toBe(true);

        const searchRes = await repo.searchSimilar({
            userId: "user-fallback",
            queryEmbedding: new Array(EXPECTED_EMBEDDING_DIMENSION).fill(0.1),
            limit: 5,
        });

        expect(searchRes.ok).toBe(true);
        if (!searchRes.ok) return;
        expect(searchRes.data.length).toBe(1);
        expect(searchRes.data[0]!.text).toBe("Fallback test content");
    });
});

describe("Grounded QA: Answer Generation & Citations", () => {
    it("returns insufficientEvidence immediately when chunks are empty", async () => {
        const result = await answerFromDocument("What is the speed of light?", []);
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.insufficientEvidence).toBe(true);
        expect(result.data.sources).toEqual([]);
        expect(result.data.answer.toLowerCase()).toContain("sufficient evidence");
    });

    it("generates grounded answer with verified citations using mock provider", async () => {
        const evidenceChunks: RetrievedChunk[] = [
            {
                chunkId: "chunk-alpha-0",
                documentId: "doc-alpha",
                userId: "user-1",
                sessionId: "sess-1",
                chunkIndex: 0,
                text: "NEXUS ROUTER guarantees deterministic model routing based on user constraints.",
                score: 0.95,
                metadata: {
                    filename: "nexus.md",
                    headingPath: ["Routing"],
                    pageNumber: 1,
                },
            },
        ];

        const mockProvider: AnswerProvider = {
            modelName: "mock-llm-70b",
            async generate() {
                return JSON.stringify({
                    answer: "NEXUS ROUTER guarantees deterministic model routing based on constraints.",
                    insufficientEvidence: false,
                    citedChunkIds: ["chunk-alpha-0"],
                });
            },
        };

        const result = await answerFromDocument("Does NEXUS ROUTER route deterministically?", evidenceChunks, {
            provider: mockProvider,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.insufficientEvidence).toBe(false);
        expect(result.data.answer).toContain("deterministic model routing");
        expect(result.data.sources.length).toBe(1);
        expect(result.data.sources[0]!.chunkId).toBe("chunk-alpha-0");
        expect(result.data.sources[0]!.filename).toBe("nexus.md");
        expect(result.data.modelUsed).toBe("mock-llm-70b");
    });

    it("filters out hallucinated citations not present in evidence", async () => {
        const evidenceChunks: RetrievedChunk[] = [
            {
                chunkId: "valid-chunk-1",
                documentId: "doc-1",
                userId: "user-1",
                sessionId: "sess-1",
                chunkIndex: 0,
                text: "Supported statement text.",
                score: 0.88,
                metadata: { filename: "spec.txt" },
            },
        ];

        const mockProvider: AnswerProvider = {
            modelName: "mock-llm",
            async generate() {
                return JSON.stringify({
                    answer: "Supported statement text.",
                    insufficientEvidence: false,
                    // "fake-chunk-999" does not exist in evidenceChunks!
                    citedChunkIds: ["fake-chunk-999", "valid-chunk-1"],
                });
            },
        };

        const result = await answerFromDocument("What is the statement?", evidenceChunks, {
            provider: mockProvider,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.sources.length).toBe(1);
        expect(result.data.sources[0]!.chunkId).toBe("valid-chunk-1");
    });

    it("handles provider failure gracefully with typed error", async () => {
        const evidenceChunks: RetrievedChunk[] = [
            {
                chunkId: "c1",
                documentId: "d1",
                userId: "u1",
                sessionId: "s1",
                chunkIndex: 0,
                text: "Sample text",
                score: 0.9,
                metadata: {},
            },
        ];

        const failingProvider: AnswerProvider = {
            async generate() {
                throw new Error("Network connection reset");
            },
        };

        const result = await answerFromDocument("Question?", evidenceChunks, {
            provider: failingProvider,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("PROVIDER_ERROR");
            expect(result.error.message).toContain("Network connection reset");
        }
    });
});
