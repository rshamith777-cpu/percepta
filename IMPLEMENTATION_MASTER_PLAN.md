# KriyaOS — Implementation Master Plan (Blueprint Audit)

**Project:** `C:\Users\ddsai\Downloads\KriyaOS` (existing Next.js 16 / React 19 / TypeScript / Tailwind)  
**Audit basis:** source code inspection, API routes, tests, and prior verification runs. **README claims not trusted without code evidence.**  
**Rules honored:** no fake integrations/telemetry/latency/cloud connections; no secrets exposed; no safety weakening; synthetic/confirmed de-energized demo only; no destructive git actions; no large model downloads.

## Status legend
- **WORKING** — implemented and tested (or verified by code + passing tests/API smoke where noted)
- **PARTIAL** — implemented but incomplete / runtime-dependent / limited scope
- **NOT IMPLEMENTED** — no genuine implementation found
- **BLOCKED** — requires credentials, paid/API access, hardware, external service availability, or impractical local resources

## Requirement-by-requirement matrix

| Feature | Status | Evidence (code/tests/verification) | Blocker / notes |
|---|---|---|---|
| Gemini diagnosis | **PARTIAL** (implemented, externally dependent) | `src/modules/ai/geminiDiagnosis.ts`, `src/app/api/diagnose/route.ts`, `@google/genai`; Zod validation; pre/post deterministic safety; graceful 429/missing-key/timeout/malformed handling (no fabricated diagnosis). API-verified: BLOCK works; safe-flow Gemini response observed once (runtime-dependent). | Requires `GOOGLE_AI_API_KEY`, model access, quota, network. |
| Gemini Live | **NOT IMPLEMENTED** | No Live/realtime implementation. Reported not integrated in `/api/integrations/status`. | Official API/access/credentials + implementation + testing. |
| Nano Banana image generation/editing | **NOT IMPLEMENTED** (fallback exists) | No official image gen/edit API. 2D SVG annotations + camera overlay fallback (advisory). | Official API access/credentials + verified implementation. |
| Lyria audio | **PARTIAL** (configurable hook only) | `src/app/api/audio/lyria/*`, `AmbientAudioCard`; browser speech synthesis remains guidance path. Disabled unless configured; user-requested; not a safety feature. | Official access/eligibility varies; no verified official endpoint claimed. |
| Gemma local inference | **NOT IMPLEMENTED** as inference (advisory watchdog hook partial) | No Gemma model/runtime/browser inference. `/api/safety/watchdog` optional local-runtime text-only advisory; deterministic gate authoritative. | Model/runtime install, size/RAM/latency measurement, offline-disconnected proof required. **8 GB RAM/limited disk:** no automatic model install. Not safety-authoritative. |
| Google Agent Skills | **NOT IMPLEMENTED** | No Agent Skills integration. Local maintenance/audit/export; CMMS demo simulator only. | Supported path + authorization + testing. No real ERP/orders. |
| Google AI Studio workflow | **NOT IMPLEMENTED** as app integration | No AI Studio workflow integration. Gemini API usage is separate server-side diagnosis. | Define supported workflow; credentials/access. |
| Google Antigravity workflow | **NOT IMPLEMENTED** | No implementation found. | Requires official product/API definition and access. |
| Firebase/Firestore | **NOT IMPLEMENTED** | No Firebase SDK/integration. Status reports config hints only; no silent uploads. | Credentials, explicit authorized flows, privacy controls, testing. |
| BigQuery | **NOT IMPLEMENTED** | No BigQuery client/integration. No auto-send of robotics/telemetry. | GCP auth/dataset, explicit opt-in, privacy controls. |
| Cloud Run | **NOT IMPLEMENTED** | No verified Cloud Run/Docker deployment config in repo. | GCP project, container/config, secrets, deployment testing. |
| PDF manual retrieval | **WORKING/PARTIAL** | Upload/list/select, PDF extraction, chunking, lexical retrieval, relevance/eligibility fail-closed, server-side citation validation (title/page/passage). Candidate retrieval ≠ validated grounding. | Scanned OCR needs Tesseract/service; no manufacturer validation claim. |
| Context caching | **NOT IMPLEMENTED** | No explicit Gemini context-caching usage found in diagnosis path. | API fit + implementation + cost/behavior testing. |
| Camera | **PARTIAL** | Capture/start/stop/clear UI + 2D overlay fallback; permission states. Cannot verify isolation/safe-to-touch. | Device/browser permission. |
| Microphone | **PARTIAL** | Browser speech recognition; locale hints (EN/HI/KN); no auto-submit. | Permissions/browser support vary. |
| Browser voice | **WORKING/PARTIAL** | Speech recognition input + speech synthesis output. No Gemini STT/TTS claimed. | Browser/device voices vary. |
| Visual annotations | **WORKING/PARTIAL** (advisory 2D) | Validated SVG annotations, 2D camera overlay; advisory/not safety certification/not spatial AR. | Not pixel-perfect/tracking. |
| Offline operation | **PARTIAL** (honest, limited) | Connectivity banner; safety guidance visible when loaded. **No offline AI diagnosis.** No service worker/full PWA cache for app/API data; manuals/records via backend when server runs. | SW + cached manuals/records + queue/sync/conflict handling need careful implementation + offline-disconnected testing. |
| Safety watchdog | **PARTIAL** (advisory) | `/api/safety/watchdog`, UI; optional local-runtime text-only advisory. **Never overrides deterministic gate/BLOCK.** | Local runtime config; no real hazard detection. |
| Maintenance records | **WORKING** | Sessions, repair attempts, verification checklist/evidence/confirmation, lifecycle; blocked cannot be `verified_resolved` (API 409 verified). | Local JSON prototype storage. |
| CMMS/ERP | **PARTIAL** (local simulator only) | Synthetic demo adapter, no real ERP contact/orders; export/sync labeled. | Real connector needs authorization/credentials. |
| Repair verification | **WORKING** | Technician-entered evidence/checklist/confirmation; not AI/camera certification. | Human process. |
| Audit trail | **WORKING** | Append-only audit events/history; exportable. | Local prototype. |
| Robotics data collection | **PARTIAL** (local synthetic prototype added in this checkpoint) | Privacy-conscious **local synthetic** trajectory schema/store/API/export added; no real worker data, no auto BigQuery/upload. | Real collection needs consent/governance/explicit opt-in; BigQuery blocked. |
| Authentication and authorization | **PARTIAL** (foundation, off by default) | Optional local auth routes/foundation; not production-ready (no full RBAC/CSRF/user management). | Production hardening required. |
| Export and privacy controls | **PARTIAL** | JSON/CSV maintenance export; gitignored local data; no secrets/silent external uploads in core flows. | Cloud sync targets blocked; stronger privacy UX for production. |

## Highest-impact feasible gaps (constraints: 8 GB RAM, limited C:)
1. Robotics prototype (local synthetic schema/store/export) — **implemented** (see below).
2. Minimal PWA metadata (manifest) — low-risk, **does not claim full offline**.
3. Keep integration status truthful/typed; no behavior regression.

## Blocked / not feasible now
- Gemini Live, Nano Banana official, Lyria official, Agent Skills, Antigravity, Firebase/Firestore, BigQuery, Cloud Run real deployments: credentials/access/product availability/testing.
- Gemma local inference with measured latency/size/memory + offline-disconnected proof: no automatic large model install.
- Full offline-first (SW + cached data + queue/sync/conflict) and Gemini context caching: non-trivial/risky without dedicated testing.
- Real ERP orders/external actions: forbidden without authorization.

## Checkpoints executed
1. Audit + master plan — complete.
2. Core reliability — preserved (tests/build pass).
3. Robotics data prototype — local synthetic schema/module/API/export (privacy-conscious; no external upload).
4. Minimal manifest — added if safe.
5. Regression — tsc/lint/test/build run (see final report).

*No completion declared from placeholders or docs alone.*
