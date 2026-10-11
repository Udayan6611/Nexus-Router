// Contracts and Adapters
export * from "./contracts";

// Task Understanding Module
export * from "./task-understanding";

// Model Recommendation Module
export * from "./model-recommendation";

// Document Processing Module
export {
    extractDocument,
    chunkDocument,
    canAccess,
    authorizeScope,
    filterChunksForScope,
    DEFAULT_CONFIG,
    SOURCE_TYPES,
} from "./document-processing";
export type {
    ExtractDocumentOptions,
    ChunkingConfig,
    DocumentLimits,
    DocumentProcessingConfig,
    DocumentProcessingConfigOverrides,
    SourceType,
    DocumentOwner,
    FileDocumentInput,
    PastedTextInput,
    DocumentInput,
    ChunkMetadata,
    DocumentChunk,
    ExtractedDocument,
    DocumentErrorCode,
    DocumentError,
} from "./document-processing";

// Knowledge and RAG Module
export * from "./knowledge";
