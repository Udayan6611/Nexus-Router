# NEXUS ROUTER — ENGINEERING HANDOFF

**Last updated:** 2026-10-11  
**Project root:** `D:\Nexus_Router\`  
**Competition:** VORTEXA 3.0  
**Problem statement:** A-01 — ModelRouter: Cost-, Latency- & Quality-Aware AI Routing  
**Domain:** AI Systems & Infrastructure

## 1. Purpose and source of truth

NEXUS ROUTER is a web-first model discovery and inference-routing workspace for explainable, constraint-aware model routing, inference execution, safe fallback, failure simulation, and auditable metrics.

This handoff is the durable source of truth for future work. Preserve the product requirements, module sequence, architecture boundaries, ownership boundaries, and Git policy. Do not claim a change is applied or verified without actual local evidence.

## 2. Current verified workspace

- OS/shell: Windows PowerShell; IDE: Antigravity.
- Node.js `v24.16.0`; npm `11.5.2`; Git `2.49.0.windows.1`.
- Root: `D:\Nexus_Router\`; npm package: `nexus-router`.
- Next.js `16.4.0`; React `19.3.0`; App Router; `src/`; `@/*` alias; Tailwind and ESLint configured.
- Initial scaffold was installed; `npm install` initially added 437 packages.
- Git was initialized on branch `main`. **No commits have been made.**
- The starter page was opened locally and `GET /` returned HTTP 200 during initialization.
- `NEXUS_ROUTER_HANDOFF.md` exists locally, but the previously uploaded copy was stale. This revised handoff must replace that old local copy before it is treated as current.

### Dependencies confirmed by actual terminal output

Command run:
```powershell
npm ls @supabase/supabase-js zod vitest
```
Output confirmed:
- `@supabase/supabase-js@2.117.3`
- `zod@4.6.5`
- `vitest@3.2.4`

Do not assume any other dependency version without checking `package.json` or terminal output.

## 3. Implemented work and verification

### Module 1 — Batch 1: Foundation utilities — VERIFIED

Applied files:
- `vitest.config.ts`
- `src/lib/ids.ts`
- `src/lib/errors/codes.ts`
- `src/lib/errors/schemas.ts`
- `src/lib/errors/app-error.ts`
- `src/lib/errors/serialize.ts`
- `src/lib/errors/index.ts`
- `src/lib/server/redact.ts`
- `src/lib/server/logger.ts`
- `src/lib/server/env.ts`
- `src/lib/ids.test.ts`
- `src/lib/errors/errors.test.ts`
- `src/lib/server/redact.test.ts`
- `src/lib/server/logger.test.ts`
- `src/lib/server/env.test.ts`
- `.env.example`
- `package.json` / lockfile updates for Zod, Vitest, and scripts.

Implemented: request/run ID utilities; typed application error codes and schemas; API error serialization; structured server logging; secret redaction; environment validation conventions; Vitest scripts.

Verified user-reported results after the redaction regression fix:
- `npm test`: **5 test files passed, 40 tests passed**.
- `npm run lint`: passed.
- `npm run build`: passed.
- `git status --short -- .env.example`: `?? .env.example`, so the example file is visible to Git.
- Query-string redaction was corrected so a sensitive parameter is redacted without consuming following harmless query parameters. Regression tests passed.

Known note: logging redaction is defense in depth. Call sites must still avoid logging secrets or raw user prompts/document contents.

### Module 1 — Batch 2: Shared domain contracts — VERIFIED

Applied under `src/lib/contracts/`:
- `primitives.ts`
- `catalogue.ts`
- `routing.ts`
- `inference.ts`
- `runs.ts`
- `api.ts`
- `index.ts`
- `catalogue.test.ts`
- `routing.test.ts`
- `inference.test.ts`
- `runs.test.ts`
- `api.test.ts`

Implemented shared bounded primitives and IDs/timestamps/limits; canonical model reference and catalogue metadata contracts; metadata provenance/known-stale-unknown states; routing requirements and preferences; separation of explicit hard constraints from inferred requirements; routing decisions, candidate evaluations and rejection reasons; inference request/response/usage/provider error contracts; run/attempt statuses, fallback traces, telemetry/usage events and health observations; compatible success/error API envelopes; synthetic fixtures and tests.

Final user-reported verification after fixing a duplicated test helper and optional fixture fields:
- `npx tsc --noEmit`: passed, no output.
- `npm test`: **10 test files passed, 161 tests passed**.
- `npm run lint`: 0 errors, 5 warnings:
  - `src/lib/contracts/inference.test.ts`: unused `_deadline` at line 84 and `_mode` at line 132.
  - `src/lib/contracts/runs.test.ts`: unused `_mode` at lines 66, 175, and 199.
- `npm run build`: successful production build; TypeScript completed and static pages generated. Routes reported included `/` and `/_not-found`.

Batch 2 is complete. Do not re-run or redesign it without a concrete integration issue.

### Module 1 — Batch 3: Supabase server-client foundation — VERIFIED

Applied files:
- `src/lib/server/supabase.ts`
- `src/lib/server/supabase.test.ts`
- `src/lib/server/env.ts` (extended with `supabaseConfigSchema`, `SupabaseConfig`, `isSupabaseConfigured`, and `getSupabaseConfig`)
- `src/lib/server/env.test.ts` (added tests for Supabase configuration presence, missing variables, and secret protection)
- `.env.example` (updated with safe placeholders)
- `package.json` / `package-lock.json` (`@supabase/supabase-js@^2.117.3` added)

Implemented:
- Installed `@supabase/supabase-js` without adding `@supabase/ssr` or unneeded dependencies.
- Extended server-side environment validation for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Variables remain strictly server-side and never prefixed with `NEXT_PUBLIC_`.
- Server-only Supabase client factory `createSupabaseClient()` and singleton getter `getSupabaseClient()` with server-environment assertions guarding against browser execution (`assertServerEnvironment()`).
- Server-safe auth defaults (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`).
- Typed configuration errors: when Supabase credentials are missing or invalid, throws `AppError("configuration_error")` naming variable paths without echoing secret values.
- Focused unit tests verifying valid instantiation, missing credentials, partial options, invalid formats, error details, browser guards, and singleton caching/resetting.

Final verification results:
- `npx tsc --noEmit`: passed, no output.
- `npm test`: **11 test files passed, 182 tests passed**.
- `npm run lint`: 0 errors, 5 preexisting warnings (unused parameters in Batch 2 tests).
- `npm run build`: successful Next.js production build (Turbopack, static page generation passed).

### Current status summary

- Initialization: **Verified**
- Module 1 Batch 1: **Verified**
- Module 1 Batch 2: **Verified**
- Module 1 Batch 3: **Verified**
- Module 2 (Model Catalogue & Explorer APIs): **Verified**
- Module 3 (Deterministic Router Engine): **Verified**
- Module 4 (Provider Adapters & Simulator): **Verified**
- Module 5 (Execution, Orchestration, Fallback & Cancellation): **Verified**
- Module 6 (Persistence, Telemetry & Read APIs): **Verified**
- Module 7 (Integration, Rate Limiting & Security): **Verified**
- All Backend Modules (1–7): **Complete & Verified**
- Supabase SDK: **Installed (`@supabase/supabase-js@2.117.3`)**
- Git: initialized on `main`; ready for checkpoint commit.

### Modules 2–7 Verification Details

#### Module 2 — Model Catalogue & Explorer APIs (VERIFIED)
- Migrations: `supabase/migrations/0001_model_catalogue.sql` (providers & models schema with indexes).
- Catalogue data: `src/lib/catalogue/models.ts` canonical model dataset conforming to `modelMetadataSchema`.
- Repository & schemas: `src/lib/catalogue/repository.ts`, `src/lib/catalogue/schemas.ts`.
- Endpoints implemented:
  - `GET /api/models` (search, filters, sorting, pagination)
  - `GET /api/models/[id]` (model detail lookup, 404 for missing IDs)
  - `POST /api/models/compare` (comparison matrix across cost, latency, quality, context window)
- Tests: `src/lib/catalogue/catalogue.test.ts` (16 tests passed).

#### Module 3 — Deterministic Routing Engine (VERIFIED)
- Pure engine: `src/lib/router/engine.ts`.
- Enforces: maximum cost, maximum latency, required capabilities, context window, quality tier, provider allow/block lists.
- Ranks candidates by cost, latency, or quality preferences among eligible candidates only.
- Strict rejection reasons: explicit codes, conservative handling of unknown/stale metadata.
- Explicit `no_eligible_model` outcome when no candidate satisfies hard constraints.
- Deadline-aware fallback validation (`validateFallback`).
- Tests: `src/lib/router/engine.test.ts` (14 tests passed).

#### Module 4 — Provider Adapters & Offline Simulator (VERIFIED)
- Provider interface: `src/lib/providers/types.ts`.
- Deterministic simulator: `src/lib/providers/simulator.ts` (offline deterministic execution, artificial latency, forced faults 429/500/503/timeout, cancellation).
- Groq adapter: `src/lib/providers/groq.ts` (server-side `GROQ_API_KEY`, native fetch, normalized errors, retry-after headers, secret redaction).
- Registry: `src/lib/providers/registry.ts`.
- Tests: `src/lib/providers/adapters.test.ts` (15 tests passed).

#### Module 5 — Execution, Orchestration, Fallback & Cancellation (VERIFIED)
- Unified orchestration engine: `src/lib/orchestration/orchestrator.ts`.
- Request schemas: `src/lib/orchestration/schemas.ts`.
- Active run & cancellation tracking: `src/lib/orchestration/tracker.ts`.
- Endpoints implemented:
  - `POST /api/route` (automatic routing, execution, fallback, 422 for no_eligible_model)
  - `POST /api/playground/run` (selected-model or automatic execution with simulation fault controls)
  - `POST /api/runs/[id]/cancel` (best-effort cancellation via AbortSignal)
- Constraint-preserving fallback without loops; revalidates fallback against remaining deadline.
- Tests: `src/lib/orchestration/orchestrator.test.ts` (5 tests passed).

#### Module 6 — Persistence, Telemetry & Read APIs (VERIFIED)
- Migrations: `supabase/migrations/0002_runs_and_telemetry.sql` (runs & usage_events tables with indexes).
- Persistence layer: `src/lib/persistence/runs-repository.ts`, `src/lib/persistence/types.ts`.
- Endpoints implemented:
  - `GET /api/runs/[id]` (retrieves run record with `storageSource`)
  - `GET /api/runs/[id]/trace` (retrieves decision, attempt history, and fallback trace)
  - `GET /api/usage` (aggregates runs, tokens, reported charges, and estimated costs)
- Explicit provenance: distinguishes `database` from `in_memory_recent`; never claims DB persistence if unconfigured.
- Tests: `src/lib/persistence/persistence.test.ts` (5 tests passed).

#### Module 7 — Integration, Rate Limiting & Security (VERIFIED)
- In-memory rate limiting: `src/lib/server/rate-limiter.ts` (sliding window per client, HTTP 429).
- Integration test suite: `src/lib/integration.test.ts` (6 end-to-end tests passed).
- Verified full lifecycle: catalogue -> route -> execute -> fallback -> persist -> read.
- Verified secret redaction: zero secret leakage in serialized API envelopes and traces.
- Overall verification:
  - `npx tsc --noEmit`: **PASSED** (0 errors).
  - `npm test`: **PASSED** (17 test files, 243 tests passed).
  - `npm run lint`: **PASSED** (0 errors, 5 preexisting warnings).
  - `npm run build`: **PASSED** (all 9 Route Handlers + static pages compiled).

## 4. Agreed stack and guardrails

- Next.js App Router, React, TypeScript, Tailwind.
- Next.js Route Handlers; Zod validation; Vitest.
- Supabase PostgreSQL for persistence, introduced incrementally.
- Provider-neutral server-side inference adapters.
- Groq is the proposed first live provider only after verifying current model availability, API access, and quota.
- A clearly labelled simulator must allow routing demonstrations without live credentials.
- Gemini embeddings and AI/RAG features are later integration work, not prerequisites for the deterministic router.
- Do not introduce a Python backend, Redis, Kubernetes, LangChain, or unnecessary frameworks.
- Keep secrets server-side. Never expose service-role keys to browser/client code.
- Do not fabricate prices, model capabilities, context limits, latency, quality, availability, or usage.
- Distinguish verified metadata, estimates, unknown/stale values, and simulated values.
- Treat uploaded/user content as untrusted.

## 5. Product requirements

### Model discovery
Catalogue search, filtering, pagination, model detail pages, and comparison. Metadata must identify provenance and whether values are verified, estimated, unknown, stale, or simulated.

### Constraint-aware routing
The deterministic TypeScript engine must:
1. Enforce explicit maximum cost and maximum latency.
2. Enforce required capabilities and context length when relevant.
3. Filter ineligible candidates before ranking.
4. Apply cost/latency/quality preferences only among eligible candidates.
5. Explain rejection reasons for considered candidates.
6. Handle unknown/stale metadata conservatively and estimate task complexity conservatively when uncertain.
7. Return explicit `no_eligible_model` when nothing qualifies.
8. Never let an LLM override hard constraints or silently relax them.

### Execution and fallback
Support selected-model execution and automatic routing; provider-neutral adapters; normalized responses/errors; timeouts; bounded safe retries; safe fallback; best-effort cancellation; stable run IDs/status; attempt history; explainable traces. A fallback must satisfy the original constraints and remaining deadline. Never silently choose an ineligible fallback.

### Failure simulation
Support controlled availability/latency changes, timeout, HTTP 429, HTTP 500, fallback and rejection behavior. Clearly label simulated results and never present them as live provider performance.

### Telemetry and persistence
Track where available: run IDs and decisions; considered/rejected candidates and reasons; provider attempts/failures/fallback; actual elapsed latency; provider-reported token usage/charges; estimated cost separately from reported charges; status/traces; usage events; model-health observations. Never fabricate missing usage/cost data. Define explicit behavior when Supabase is not configured.

### Security
Server-side secrets; input validation; request-size limits and rate limiting; log/error redaction; appropriate database access controls/RLS; untrusted file/content handling; prompt-injection defenses for AI-assisted task understanding.

## 6. Planned API surface

- `GET /api/models` — search/filter/list models.
- `GET /api/models/:id` — model details.
- `POST /api/models/compare` — compare models.
- `POST /api/route` — routing decision/execution contract.
- `POST /api/playground/run` — run Playground inference.
- `POST /api/runs/:id/cancel` — best-effort cancellation.
- `GET /api/runs/:id` — run status/result.
- `GET /api/runs/:id/trace` — routing/execution trace.
- `GET /api/usage` — usage/telemetry summaries.

Exact request/response schemas should build on Module 1 contracts and be refined in the relevant modules. Keep Route Handlers thin and avoid duplicate orchestration.

## 7. Authoritative backend module sequence

Initialization is a prerequisite, not a numbered module.

### Module 1 — Shared Backend Foundation
Establish shared TypeScript contracts, Zod schemas, typed errors, server utilities, request/run ID conventions, structured logging/redaction, environment-variable conventions, server-side Supabase client/database foundation, and stable interfaces for later modules. **Batch 1, Batch 2, and Batch 3 are verified complete.**

### Module 2 — Model Catalogue and Explorer APIs
Implement provider/model metadata, catalogue access, migrations/seed data as appropriate, search/filter/pagination, model lookup, and comparison APIs.

### Module 3 — Deterministic Routing Engine
Implement pure/testable eligibility, ranking, hard constraints, rejection explanations, conservative uncertainty handling, deadline-aware fallback eligibility, and explicit no-eligible outcomes. No LLM override.

### Module 4 — Provider Adapters and Inference Execution
Implement provider-neutral interface, first verified live provider adapter, normalized responses/errors, timeouts, bounded safe retries, and simulator.

### Module 5 — Playground, Orchestration, Fallback, and Failure Simulation
Implement selected-model and automatic-routing execution, fault injection, safe fallback, best-effort cancellation, run status, attempt history, and explainable execution results.

### Module 6 — Persistence, Telemetry, and Read APIs
Implement persistence schemas, migrations, indexes, constraints, access controls, telemetry recording, run retrieval, trace retrieval, and usage APIs.

### Module 7 — Security, Testing, and Backend Integration
Test the integrated backend end to end: constraints, rejection, provider failures, deadlines, fallback, fault injection, cancellation, telemetry, persistence, validation, and secret redaction. Resolve cross-module mismatches and security issues.

**Do not replace this sequence with “contracts → registry → routing → providers → telemetry → persistence.”**

## 8. Integration boundaries

The user owns backend/router/Supabase infrastructure. A friend may later own AI/RAG/files/voice modules. Do not implement or integrate those modules during the current backend work unless explicitly authorized.

The intended friend-facing functions discussed are:
- `understandTask(input: TaskUnderstandingInput): Promise<TaskRequirements>`
- `recommendModels(requirements: TaskRequirements, candidates: ModelCandidate[]): Promise<ModelRecommendation[]>`
- `extractDocument(file: DocumentInput): Promise<ExtractedDocument>`
- `ingestDocument(document: ExtractedDocument): Promise<IngestionResult>`
- `retrieveKnowledge(query: string, documentId?: string): Promise<RetrievedChunk[]>`
- `answerFromDocument(query: string, chunks: RetrievedChunk[]): Promise<GroundedAnswer>`
- `transcribeAudio(audio: AudioInput): Promise<TranscriptionResult>`
- `speakText(text: string): Promise<SpeechResult>`

These are planning notes, not finalized contracts. Future integration must reuse the shared catalogue type from `src/lib/contracts/catalogue.ts`, not define a competing model candidate schema. Keep explicit user hard constraints distinct from inferred requirements/preferences/confidence. AI recommendations are advisory and cannot override deterministic router eligibility. Agree on document repository IDs, ownership, dimensions, metadata and persistence schema before implementation. Keep file/audio inputs server-compatible and validate them. If using `Result<T>`, apply it consistently. Distinguish an AI shortlist with no recommendations (`NO_SUITABLE_MODELS`) from router outcome `no_eligible_model`.

## 9. Known design checks for later implementation

- `explicitConstraintsSchema.maxCostUsd` currently appears to require a positive value. Decide whether a zero-dollar budget should be allowed and test it before relying on that boundary.
- Schemas represent data but do not enforce runtime fallback eligibility by themselves. Module 3/5 must re-check fallback against the original constraints and remaining deadline.
- Unknown/stale metadata is represented by contracts; conservative behavior must be implemented and tested in Module 3.
- Confirm friend-facing signatures against the shared contracts before integration.
- Do not invent a Supabase schema during Module 1 Batch 3. Catalogue tables/migrations belong to Module 2; run/telemetry persistence belongs to Module 6.
- Current lint warnings are the five unused underscore-prefixed test parameters listed above. They are warnings, not errors; avoid broad unrelated cleanup under time pressure.

## 10. Working method and tools

- **Use Antigravity IDE from now on** to inspect, edit, run, test, and integrate the local project. Do not route work through Claude.
- Work directly in `D:\Nexus_Router\`.
- Proceed one bounded batch at a time. Give Antigravity a precise task with prerequisites, exact paths, exports/contracts, dependencies, env names, commands, tests, and acceptance criteria.
- Antigravity-generated code is not applied or verified until it is present locally and commands have been run.
- Inspect actual diffs and outputs. Do not assume local state or claim success prematurely.
- Because the time window is short, avoid speculative abstractions, repeated redesign, and unnecessary dependency additions. Preserve the authoritative sequence.
- Keep `NEXUS_ROUTER_HANDOFF.md` current at meaningful checkpoints. The assistant should prepare the updated handoff content/file rather than repeatedly asking the user to manually rewrite status notes.

## 11. Git policy

Do not create a commit for each micro-step or module. The intended checkpoint is one meaningful commit after Modules 1–7 are integrated and the backend test suite passes. No commit has been made yet.

## 12. Immediate next action

**Backend Modules 1–7 Checkpoint Achieved.**

All backend modules are fully implemented, integrated, and verified:
1. Module 1: Foundation utilities, shared domain contracts, and Supabase server-client factory.
2. Module 2: Model Catalogue, migration `0001_model_catalogue.sql`, repository, search, filtering, pagination, and `GET /api/models`, `GET /api/models/[id]`, `POST /api/models/compare`.
3. Module 3: Pure deterministic routing engine, hard constraints, rejection reasons, deadline fallback checks, and explicit `no_eligible_model`.
4. Module 4: Provider-neutral adapters, offline deterministic simulator, and Groq adapter with normalized errors and retries.
5. Module 5: Orchestration engine, constraint-preserving fallback, best-effort cancellation, and `POST /api/route`, `POST /api/playground/run`, `POST /api/runs/[id]/cancel`.
6. Module 6: Persistence schema migration `0002_runs_and_telemetry.sql`, run/telemetry/usage repository, and `GET /api/runs/[id]`, `GET /api/runs/[id]/trace`, `GET /api/usage`.
7. Module 7: In-memory sliding window rate limiting, secret redaction, end-to-end integration tests (17 test files, 243 passing tests, 0 lint errors).

Next actions:
- Connect Supabase project using the activation runbook below when live persistence is desired.
- Create the agreed checkpoint Git commit for backend Modules 1–7.
- Proceed to Frontend/UI integration and Playground experience.

## 13. Supabase Integration-Readiness Status (VERIFIED)

- **Exact Required Environment Variables:**
  - `SUPABASE_URL`: HTTPS URL to the Supabase project REST API (e.g., `https://<project-ref>.supabase.co`).
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase server-only service role JWT/key (never exposed to browser, min 20 chars).
  - `GROQ_API_KEY`: (Optional) Groq API key for live inference execution (deterministic simulator used when omitted).
  - `LOG_LEVEL`: (Optional) Logging level (`debug` | `info` | `warn` | `error`, default `info`).
- **Git Ignore Security:**
  - Verified `.env.local` is ignored via `git check-ignore -v .env.local` (matches `.env*` at `.gitignore:34`). No secrets exposed or tracked.
- **Migration Dependency Order & Status:**
  - `supabase/migrations/0001_model_catalogue.sql` (Creates `providers`, `models`, foreign keys, indexes, seeds `providers` and canonical models). **Must run first.**
  - `supabase/migrations/0002_runs_and_telemetry.sql` (Creates `runs`, `usage_events`, foreign keys, indexes). **Must run second.**
  - **Evidence status:** Migrations exist locally only. No external Supabase project has been linked yet and no database application has occurred.
- **Unconfigured & Fallback Safety:**
  - `isSupabaseConfigured()` returns `false` safely when variables are missing; never throws unhandled errors.
  - Catalogue repository safely falls back to local in-memory `CANONICAL_MODELS` with source tag `canonical_seed`.
  - Runs repository persists recent records to bounded in-memory storage, returning `{ persisted: false, storageSource: "in_memory_recent" }`. It never fabricates database persistence.
- **Defects & Security Enhancements:**
  1. `src/lib/catalogue/repository.ts`: Added snake_case to camelCase column mapper (`mapDbRowToModelMetadata`) so database rows pass Zod validation upon fetching.
  2. `supabase/migrations/0001_model_catalogue.sql`: Added `INSERT INTO providers` seed statement for `groq` and `simulator` with `ON CONFLICT DO NOTHING` so foreign keys are immediately satisfied on fresh migrations.
  3. Row Level Security (RLS): Enabled RLS on all four tables (`providers`, `models`, `runs`, `usage_events`) with zero permissive client policies. Prevents unauthorized direct client/anon PostgREST access while allowing the server-side service-role client (which bypasses RLS) full intended access.
- **Live Database Connection & Persistence Status:**
  - **VERIFIED LIVE**: `.env.local` is configured with valid `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - Migrations `0001_model_catalogue.sql` and `0002_runs_and_telemetry.sql` applied to live database.
  - End-to-end inference execution (`POST /api/route`) completed successfully.
  - Run record verified in Supabase `runs` table with `status = "succeeded"`.
  - Telemetry verified in Supabase `usage_events` table with input/output tokens and cost tracking.
  - Read APIs (`GET /api/runs/[id]` and `GET /api/usage`) verified returning `storageSource: "database"`.
- **Shortest Activation Runbook:**
  1. In Supabase Dashboard, create/select project -> Project Settings -> API. Copy Project URL and `service_role` secret key.
  2. In local `.env.local`, set `SUPABASE_URL=...` and `SUPABASE_SERVICE_ROLE_KEY=...`.
  3. In Supabase SQL Editor, run `0001_model_catalogue.sql` first, then `0002_runs_and_telemetry.sql`.
  4. Verify with `npm test` and `POST /api/route` followed by `GET /api/runs/<id>` (checking `storageSource: "database"`).

## 14. AI/RAG Integration Progress — Steps 1 & 2 (VERIFIED)

- **Completed Integration Modules:**
  1. **Shared AI Contracts & Catalogue Adapter** (`src/lib/ai/contracts.ts`):
     - Maps AI task types, optimization preferences, and complexity to backend canonical schemas (`TaskType`, `OptimizationPreference`, `ComplexityLevel`).
     - Strictly separates explicit user constraints from AI-inferred requirements; only explicit user statements with verbatim prompt quotes can define hard routing constraints (`maxCostUsd`, `maxLatencyMs`, etc.).
     - `catalogueToCandidate()` converts rich `ModelMetadata` records into recommendation candidates while strictly preserving canonical model IDs (e.g. `llama-3.3-70b-versatile`, `sim-basic-fast`).
     - `filterRecommendationsByRouterEligibility()` enforces that recommendations are advisory only; the deterministic routing engine retains absolute authority over model eligibility and selection.
  2. **Task Understanding Subsystem** (`src/lib/ai/task-understanding/`):
     - `understandTask()`, `preprocessInput()`, `normalizeAiOutput()`, `buildFallback()`, `createGroqProvider()`.
     - Tolerant JSON parsing with defensive fallback for provider timeouts, outages, and malformed outputs.
     - Demotes unquoted constraints and document-sourced text to low-confidence inferences.
     - Injected mock providers in tests guarantee zero live network or provider calls during automated test suites.
  3. **Model Recommendation Subsystem** (`src/lib/ai/model-recommendation/`):
     - `recommendModels()`, `recommendModelsWithDiagnostics()`, `evaluateCandidate()`, `rankCandidates()`, `explainRecommendation()`.
     - Deterministic multi-dimensional candidate evaluation and ranking.
     - Explanations provide honest reasons, tradeoffs, catalogue limitations, and the mandatory router notice.
- **Verification Metrics:**
  - `npm test`: **PASSED** (18 test files, 262 passed, 0 failures).
  - `npx tsc --noEmit`: **PASSED** (0 type errors).
  - `npm run lint`: **PASSED** (0 errors, 5 preexisting test warnings).
  - `npm run build`: **PASSED** (all 9 Route Handlers + static pages compiled successfully via Next.js Turbopack).
  - Live Provider Calls: **0** (all unit and integration tests use deterministic mocks/simulators).

## 15. Document Processing & Persistent RAG Subsystem (VERIFIED)

**Status:** IMPLEMENTED and VERIFIED locally.

### 1. Exact Files Created and Modified
- **Database Schema Migration:**
  - [`supabase/migrations/0003_documents_and_knowledge.sql`](file:///D:/Nexus_Router/supabase/migrations/0003_documents_and_knowledge.sql): Additive migration creating `documents`, `document_chunks` with `vector(768)` for Gemini `text-embedding-004`, HNSW cosine index, RLS enabled, and `match_document_chunks` RPC.
- **Document Processing Engine (`src/lib/ai/document-processing/`):**
  - `contracts.ts`: Shared document types (`SourceType`, `DocumentInput`, `ChunkMetadata`, `DocumentChunk`, `ExtractedDocument`, typed errors).
  - `config.ts`: Chunking and limit configurations (defaults: max 20MB, 500 pages, target 400 tokens, 80 token overlap).
  - `validateInput.ts`: File size, extension, MIME type, and magic bytes validation.
  - `blocks.ts`: Structural block parsing for paragraphs, headings, code blocks, lists.
  - `chunkDocument.ts`: Structure-aware token-bounded chunking preserving heading hierarchy, pages, and character offsets.
  - `isolation.ts`: Scope authorization (`canAccess`, `authorizeScope`, `filterChunksForScope`) ensuring user and session isolation.
  - `errors.ts`: Typed error builders.
  - `extractors/`:
    - `text.ts`: Plain text extractor.
    - `markdown.ts`: Markdown structural extractor tracking headings and code fences.
    - `html.ts`: Safe HTML parser using `cheerio`, stripping `<script>`, `<style>`, and unsafe markup.
    - `docx.ts`: Word document parser using `mammoth`.
    - `pdf.ts`: PDF document extractor using `unpdf`, tracking page numbers and empty page warnings.
  - `extractDocument.ts`: Unified entry point extracting PDF, DOCX, HTML, Markdown, and plain text with validation and chunking.
  - `index.ts`: Module exports.
- **Knowledge & Persistent RAG Engine (`src/lib/ai/knowledge/`):**
  - `contracts.ts`: RAG contracts (`EmbeddedChunk`, `RetrievedChunk`, `KnowledgeRepository`, `IngestionResult`, `GroundedAnswer`, `CitationReference`).
  - `embeddings.ts`: Vector validator (`validateEmbeddingVector` for 768 dimensions), `GeminiEmbeddingProvider` with verified `Promise.race` cancellation timeout, `embedText`, `embedBatchTexts`.
  - `repository.ts`: `cosineSimilarity`, `InMemoryKnowledgeRepository` (with strict user/session scoping), `SupabaseKnowledgeRepository` (pgvector RPC with automatic fallback to in-memory storage for test/local resilience), `getKnowledgeRepository`, `resetKnowledgeRepository`.
  - `prompts.ts`: `GROUNDED_ANSWER_SYSTEM_PROMPT` and `buildGroundedUserMessage`.
  - `ingestDocument.ts`: Batch embeddings generation and persistence through `KnowledgeRepository`.
  - `retrieveKnowledge.ts`: Query embedding generation, similarity search, user ownership isolation, and ranked evidence retrieval.
  - `answerFromDocument.ts`: Grounded QA generator with strict citation verification, hallucinated citation filtering, insufficient evidence detection, mockable `AnswerProvider` and `DefaultGroqAnswerProvider`.
  - `index.ts`: Public knowledge exports.
- **Subsystem Barrel:**
  - [`src/lib/ai/index.ts`](file:///D:/Nexus_Router/src/lib/ai/index.ts): Unified exports for AI contracts, task understanding, model recommendation, document processing, and persistent RAG without contract collisions.
- **Unit and Integration Tests:**
  - [`src/lib/ai/rag.test.ts`](file:///D:/Nexus_Router/src/lib/ai/rag.test.ts): 22 focused tests verifying parsing, malformed files, chunking, embeddings, repository contracts, user ownership isolation, and grounded answers.

### 2. Verified Test and Build Results
- **Vitest Unit Test Suite (`npm test`):**
  ```text
  Test Files  19 passed (19)
       Tests  284 passed (284)
    Duration  2.58s
  ```
- **TypeScript Strict Compilation (`npx tsc --noEmit`):**
  - **Passed with 0 errors**.
- **Production Build (`npm run build`):**
  - **Passed with 0 errors**. All 9 Route Handlers and static pages successfully generated by Turbopack.
- **External Calls during Tests:**
  - **0 live network calls**. Tests inject mock providers for embeddings and answer generation.

### 3. Supabase Migration Status: UNAPPLIED ON LIVE DATABASE
- Migration `supabase/migrations/0003_documents_and_knowledge.sql` exists locally in the repository.
- **It is currently UNAPPLIED to any live Supabase database.**
- To apply it, execute the following SQL in the Supabase Dashboard SQL Editor:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;

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

  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_session_id ON document_chunks(session_id) WHERE session_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

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
  ```

### 4. Incoming Teammate Frontend Integration Notes & API Contracts
The backend is completely prepared to receive the frontend ZIP from the teammates. **Do not modify backend contracts to guess frontend styles.** The frontend code can interface directly with the following HTTP endpoints and backend server functions:

#### Available HTTP Route Handlers
1. **`GET /api/models`**
   - **Query Parameters:** `provider` (optional), `taskType` (optional), `capability` (optional), `limit` (default 50), `offset` (default 0)
   - **Response Envelope:** `{ success: true, data: { items: ModelMetadata[], total: number, limit: number, offset: number, source: string }, meta: { requestId, timestamp } }`

2. **`POST /api/route`**
   - **Request Body:** `{ prompt: string, taskType?: TaskType, optimizationPreference?: OptimizationPreference, constraints?: ExplicitConstraints, userRequirements?: string[] }`
   - **Success Response (HTTP 200):** `{ success: true, data: RunRecord, meta: { requestId, timestamp } }`
   - **No Eligible Model (HTTP 422):** Returns structured `RunRecord` with `status: "no_eligible_model"` and detailed `routingDecision.rejectionReasons` explaining why every candidate was rejected.

3. **`POST /api/playground/run`**
   - **Request Body:** Same as `/api/route`, but allows explicit `modelId` override for direct playground execution without router selection.

4. **`GET /api/runs/[id]`**
   - **Response Contract:** Returns the run with `storageSource: "database" | "in_memory_recent"`.

5. **`GET /api/usage`**
   - **Query Parameters:** `since`, `until`, `provider`, `modelId`
   - **Response Contract:** Aggregated token usage and cost metrics.

#### Programmatic AI & RAG Subsystem APIs (`@/lib/ai`)
The teammate frontend (via Next.js Server Actions or Route Handlers) can directly import and call:
- `extractDocument(input: DocumentInput)`: Extracts plain text, Markdown, HTML, DOCX, and PDF with size validation and structure-aware chunking.
- `ingestDocument(document: ExtractedDocument)`: Generates 768-dim embeddings in batches and persists to Supabase (or in-memory fallback).
- `retrieveKnowledge(query: string, options?: RetrieveKnowledgeOptions)`: Performs similarity search scoped strictly to the authorized `userId` and `sessionId`.
- `answerFromDocument(query: string, chunks: RetrievedChunk[])`: Generates grounded answers strictly from retrieved evidence with verified citations.
- `understandTask(input: string)`: Analyzes raw prompt for task type, complexity, and explicit user constraints.
- `recommendModels(requirements: AiTaskRequirements)`: Generates advisory candidate ranking and tradeoffs. Note: the deterministic router retains ultimate authority over model selection.

---

## 5. Teammate Frontend Integration Status — VERIFIED

The teammate frontend prototype from `nexus-router-—-intelligent-ai-model-orchestration.zip` has been integrated into Next.js App Router (`D:\Nexus_Router`).

- **Application Architecture:** Next.js 16 App Router remains the application framework. The prototype's Vite configuration and entry points were discarded in favor of Next.js App Router pages and client state routing.
- **Pages and Views Integrated:**
  - `Landing Page` (`src/app/page.tsx`, `Hero`, `Navbar`, `AutonomousOrchestrationSection`, `DashboardPreview`, `FeaturesSection`, `HowItWorksSection`, `DeveloperSection`, `ClosingCta`, `Footer`)
  - `Model Explorer & Details` (`src/components/ExploreModels.tsx`): Populates catalogue models live from `GET /api/models`, displays category and capability filters, and surfaces advisory model recommendation banners.
  - `Interactive Playground` (`src/components/Playground.tsx`): Connected to `POST /api/playground/run` and `POST /api/route`. Receives real model selections, route traces, fallback records, real latency, token counts, and cost telemetry.
  - `Test Results & Telemetry` (`src/components/TestResults.tsx`): Renders live run records and real metrics from executed Playground runs.
  - `Task-based Recommendations` (`src/app/api/recommend/route.ts`): Connected to `understandTask` + `recommendModels` + `filterRecommendationsByRouterEligibility`.
  - `Document Extraction & RAG QA` (`src/app/api/documents/route.ts`, `src/app/api/documents/qa/route.ts`): Accepts multipart/form-data and JSON text uploads, extracts and chunks documents, and executes similarity search grounded QA with user/session tenancy.
- **Client Integration Layer:** `src/lib/client/api.ts` provides typed, robust methods for backend interaction.
- **Unused Prototype Code Cleaned:** Legacy accessibility audit components (`AccessibilityScorecard`, `ContrastMatrix`, `TypographyAudit`, `ExportModal`, `IssueDetailModal`, `OriginalPageMockup`, `RedesignedPage`, `VisionSimulator`) were pruned from `src/components/`.
- **Speech Recognition:** Uses native browser Web Speech API when available; gracefully displays unsupported status banner without hallucinating random prompts.
- **Build Verification:** `npm run build` compiled 14 static and dynamic routes cleanly with Turbopack and TypeScript verification (0 errors).



