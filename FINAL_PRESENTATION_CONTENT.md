# KriyaOS — Final Presentation Content (honest)

## Problem
Industrial field maintenance is high-risk when equipment isolation status is unclear and manuals are hard to apply under time pressure. AI assistance is useful only if it never fabricates guidance or overrides electrical safety.

## Target users
Field technicians, maintenance supervisors, and training/demo operators working with solar inverter equipment in **synthetic or confirmed de-energized** scenarios.

## Solution
KriyaOS is a web-based, safety-first AI copilot/workbench: it captures problem context, grounds responses in uploaded manuals (fail-closed when irrelevant), applies a **deterministic safety gate** before AI guidance, supports advisory Gemini diagnosis with graceful fallback, provides 2D advisory visual guidance, and tracks maintenance verification with an append-only audit trail.

## Architecture (prototype)
- **Frontend:** Next.js 16 (App Router), React, TypeScript, responsive UI.
- **Safety:** deterministic gate (`allow/caution/block`) authoritative; blocked cases cannot be verified resolved.
- **AI/manuals:** server-side Gemini (`@google/genai`) when configured; manual upload/retrieval with validated citations and relevance fail-closed.
- **Data/workflows:** local JSON prototype storage for manuals/maintenance; export (JSON/CSV); robotics synthetic trajectory prototype (consent, local only, no external upload).
- **Operations:** health/integration status endpoints, conservative PWA foundation (manifest, SW never caches `/api/*`, `/offline` fallback), Cloud Run-ready artifacts (`standalone`, Dockerfile).

## Safety-first design
- Synthetic or confirmed de-energized demos only.
- Potentially energized / unknown isolation → **BLOCK** with safe escalation.
- AI, images, voice, manuals, robotics, and offline state **cannot** certify isolation/safe-to-touch or override the gate.
- No fabricated diagnosis; graceful fallback on quota/error.
- No real ERP orders, no PII/secret leakage, no real worker telemetry upload.

## Core workflows (verified scope)
1. Manual upload + relevance/citation-grounded context.
2. Safety gate decision (allow/caution/block) before diagnosis.
3. Advisory diagnosis (Gemini when available) + fallback.
4. Maintenance record → repair notes → verification → audit/export.
5. Robotics local synthetic record (consent) → list → JSON/CSV export.
6. Offline fallback awareness (`/offline`, SW does not cache `/api/*`).

## Technology stack
Next.js, React, TypeScript, Zod, Vitest, ESLint, Google Gemini server-side integration (`@google/genai`), browser Web APIs (speech/camera where supported), Node.js local storage prototype.

## Verified results (evidence-based)
- `tsc` PASS, `lint` PASS, **108 tests passed / 1 skipped**, production build PASS.
- Robotics runtime verified: HTTP 200/201/400 behaviors, exports, persistence (prior restart check), no fabricated records on invalid/missing consent.
- Safety behavior preserved: blocked hazardous guidance; blocked maintenance cannot be marked resolved.
- Standalone build output present; `/api/health` and `/offline` served in production.

## Innovation
A **safety-authoritative AI copilot pattern** for maintenance: deterministic risk gating + fail-closed grounding + truthful capability status, so AI remains advisory and never silently upgrades unsafe conditions.

## Limitations (honest)
- Most blueprint cloud/official integrations not verified (Gemini Live, Nano Banana official, Lyria official, Agent Skills, Firebase/Firestore, BigQuery, real Cloud Run deploy, real ERP) due to credentials/access/tooling.
- No full offline sync, no offline AI diagnosis, no isolation certification, not production-certified.
- Gemma/OCR hardware/runtime dependent; local prototype storage/auth not production-grade.

## Future roadmap
1. Credentialed, verified integrations with official APIs and secure secret handling.
2. Safety-preserving offline draft queue with conflict/sync rules (never bypass gate).
3. Production authz/RBAC, durable database, observability, and Cloud Run deployment with verified URL.
4. Measured local advisory models (Gemma/runtime) with strict non-safety-authority boundaries.
5. Governed robotics/telemetry pipelines (explicit consent, minimization, approved destinations only).
