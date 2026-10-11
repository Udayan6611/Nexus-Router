-- NEXUS ROUTER: Module 6 - Runs, Telemetry and Usage Persistence Schema
-- Migration 0002_runs_and_telemetry.sql

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    status TEXT NOT NULL,
    selection_mode TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancel_requested_at TIMESTAMPTZ,
    decision JSONB,
    attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
    fallback_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    response JSONB,
    failure JSONB
);

CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_request_id ON runs(request_id) WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS usage_events (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    mode TEXT NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    latency_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    token_source TEXT,
    reported_cost_usd NUMERIC(10, 6),
    estimated_cost_usd NUMERIC(10, 6)
);

CREATE INDEX IF NOT EXISTS idx_usage_run_id ON usage_events(run_id);
CREATE INDEX IF NOT EXISTS idx_usage_model_provider ON usage_events(provider, model_id);
CREATE INDEX IF NOT EXISTS idx_usage_at ON usage_events(at DESC);

-- Enable Row Level Security (server-only architecture; service-role key bypasses RLS)
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
