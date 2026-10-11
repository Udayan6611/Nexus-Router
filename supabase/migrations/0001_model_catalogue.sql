-- NEXUS ROUTER: Module 2 - Model Catalogue Schema
-- Migration 0001_model_catalogue.sql

CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    website_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON UPDATE CASCADE,
    provider_model_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    context_window JSONB NOT NULL,
    pricing JSONB NOT NULL,
    latency JSONB NOT NULL,
    quality JSONB NOT NULL,
    availability JSONB NOT NULL,
    capabilities JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_display_name ON models(display_name);
CREATE INDEX IF NOT EXISTS idx_models_updated_at ON models(updated_at DESC);

-- Enable Row Level Security (server-only architecture; service-role key bypasses RLS)
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- Seed initial known providers
INSERT INTO providers (id, display_name, website_url) VALUES
    ('groq', 'Groq', 'https://groq.com'),
    ('simulator', 'Nexus Simulator', 'https://nexus-router.local')
ON CONFLICT (id) DO NOTHING;
