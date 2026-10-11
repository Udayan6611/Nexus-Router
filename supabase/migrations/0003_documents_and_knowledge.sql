-- NEXUS ROUTER: Module 8 - Document Processing & Persistent Knowledge (RAG) Schema
-- Migration 0003_documents_and_knowledge.sql

-- Enable pgvector extension for dense embeddings (Google text-embedding-004: 768 dimensions)
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents metadata table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    session_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Document chunks and vector embeddings table
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding vector(768),
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-004',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Query and isolation indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_session_id ON document_chunks(session_id) WHERE session_id IS NOT NULL;

-- Approximate nearest neighbor vector search index (HNSW with cosine distance)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Row Level Security: Server-only architecture.
-- All access is mediated by the Next.js server using SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS).
-- Enabling RLS with no public/anon policies denies direct client PostgREST access.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RPC for vector similarity retrieval with optional user, session, and document scoping
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(768),
    match_threshold double precision DEFAULT -1.0,
    match_count integer DEFAULT 5,
    filter_user_id text DEFAULT NULL,
    filter_session_id text DEFAULT NULL,
    filter_document_id text DEFAULT NULL
)
RETURNS TABLE (
    id text,
    document_id text,
    chunk_index integer,
    text text,
    metadata jsonb,
    user_id text,
    session_id text,
    similarity double precision
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.chunk_index,
        c.text,
        c.metadata,
        c.user_id,
        c.session_id,
        (1 - (c.embedding <=> query_embedding))::double precision AS similarity
    FROM document_chunks c
    WHERE
        c.embedding IS NOT NULL
        AND (filter_user_id IS NULL OR c.user_id = filter_user_id)
        AND (filter_session_id IS NULL OR c.session_id = filter_session_id)
        AND (filter_document_id IS NULL OR c.document_id = filter_document_id)
        AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
