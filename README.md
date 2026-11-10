# KriyaOS

KriyaOS is an AI-powered industrial repair assistant prototype focused on **solar inverter maintenance**. It is a **web-only Next.js (TypeScript + React + Tailwind)** application with a mobile-first technician workbench.

The prototype combines browser capture/input, server-side Gemini diagnosis, manual grounding with citations, validated visual annotation overlays (including an honest 2D camera-overlay fallback), deterministic safety gating, an advisory local-runtime safety watchdog integration, optional/configurable OCR for scanned PDFs, optional/configurable ambient audio integration hooks, ERP/CMMS integration/export foundations, and local maintenance/verification records.

> **Safety / demo scope:** Use **synthetic or confirmed de-energized equipment only** for demos. KriyaOS is **not** certified for real electrical maintenance and **not** a replacement for lockout/tagout, qualified technician judgment, approved procedures, or emergency response. AI, camera, image, voice, watchdog, OCR, annotation, and audio outputs are **advisory/informational** where applicable and can be wrong.

## Implemented features and current status

### Phases 0–7 (preserved)
- **Foundation:** Next.js App Router + TypeScript + Tailwind v4, mobile-first workbench, contracts, health endpoint.
- **Diagnosis:** image upload/camera capture, problem description, English/Hindi/Kannada, server-side Gemini (`@google/genai`, `GOOGLE_AI_API_KEY` server-only), Zod-validated structured diagnosis.
- **Voice:** browser speech recognition populates problem description (no auto-submit) and browser speech synthesis reads diagnosis/safe escalation with controls. No Gemini audio/STT/Lyria claim for speech guidance.
- **Manual grounding:** PDF upload/list, server-side extraction with actual page numbers, chunking, local lexical retrieval, server-side citation validation, explicit no-relevant-content/no-manual disclosures.
- **Annotations:** optional model-requested normalized annotations are server-validated and rendered as SVG overlays; unavailable states are shown; no fabrication, no safe-zone/green isolation visuals.
- **Safety gate:** deterministic pre- and post-Gemini safety evaluation is authoritative. Manual/annotation/AI/watchdog output cannot override BLOCK decisions. Camera/image/AI cannot verify isolation/energized/safe-to-touch conditions.
- **Maintenance & verification:** local prototype records, Zod APIs, idempotent create, repair attempts, technician verification evidence/confirmation/checklist, append-only verification/audit history. Blocked/dangerous cases cannot be `verified_resolved`.

### Remaining proposal features (extension pass) — status

| Feature | Status | Notes |
|---|---|---|
| **Offline Gemma/local safety watchdog** | **Partially implemented (advisory path exists; Phase 4 live inference not available)** | Adds an advisory watchdog module/API/UI with `WATCHDOG_MODE=off|local-runtime`. When configured with `WATCHDOG_URL` (e.g., a local Ollama-compatible endpoint), it performs **text-only** advisory classification via the configured local runtime, with timeout/failure-safe behavior. Deterministic safety gate remains authoritative and is never overridden, especially for BLOCK decisions. **KriyaOS watchdog client behavior was tested with mocks (prior baseline).** **Phase 4 read-only reconciliation (executed):** Ollama `0.40.15` present and local API responded, but `GET http://127.0.0.1:11434/api/tags` returned `{"models":[]}` (`gemma3:1b` not listed at check time); **no synthetic KriyaOS→Gemma inference was attempted/captured**. Prior user evidence reported `gemma3:1b` in another context — environment state differs. **Not implemented as a silent in-browser Gemma model download/inference runtime**; no model files moved/deleted/downloaded. Use localhost only for safety-check text. |
| **OCR for scanned manufacturer manuals** | **Implemented (real local Tesseract engine + HTTP fallback), with environment/setup requirements** | PDF extraction detects scanned/low-text pages and OCRs only those pages. A real **local Tesseract CLI** provider (`OCR_PROVIDER=tesseract-local`) renders PDF pages with `pdfjs-dist` + `@napi-rs/canvas` and runs Tesseract page-by-page with timeouts/cleanup, preserving original page numbers and merging OCR text into chunking/retrieval/citation validation. An HTTP OCR service provider remains available (`OCR_PROVIDER=http-service`). Upload/UI stream OCR progress states (extracting, scanned detected, page X of Y, complete/partial/unavailable/failed). No OCR text/citations are fabricated; OCR text is untrusted and may be inaccurate. **Requires** Tesseract executable + language data installed locally on Windows; no silent OCR model downloads. Real OCR engine tests are skipped unless Tesseract is installed. |
| **AR and equipment visualization** | **Partially implemented (honest 2D fallback)** | Preserves the static image annotation viewer as the reliable fallback. Adds a **2D live camera overlay (advisory)** mode using browser camera + SVG overlay mapping (no spatial AR tracking, no depth, no measurements, no object tracking). Reports camera/WebXR capability status honestly. Real-time AR tracking is not fabricated; if unsupported, fallback messaging is shown. Annotations remain advisory and safety-gated. |
| **Lyria audio integration** | **Partially implemented (graceful optional integration hook)** | Browser speech synthesis remains the spoken technician guidance path. Adds optional, **user-requested only** ambient audio endpoints/UI (`/api/audio/lyria/status`, `/api/audio/lyria/generate`, `AmbientAudioCard`). Disabled/unavailable unless explicitly configured (`LYRIA_ENABLED`, `LYRIA_MODE=custom`, `LYRIA_CUSTOM_URL`, optional key). Generated audio is **not** a safety feature/alarm/critical warning and is never auto-generated during diagnosis. Official Google Lyria access varies by product surface (Vertex/AI Studio/Agent Platform), auth, quotas, and availability; this build does not invent credentials or claim a working official endpoint without configuration. |
| **Optional SQLite maintenance persistence** | **Implemented but not live-verified** | Optional maintenance store using Node built-in `node:sqlite` (`src/lib/sqlite.ts`, `src/modules/maintenance/sqliteStore.ts`) selectable via `KRIYAOS_MAINTENANCE_STORE=sqlite` (optional `DATABASE_URL`, default `file:./dev.db`). Default remains local JSON stores; manual/robotics data remain on JSON stores. Not production-ready/multi-user hardened. |
| **ERP / CMMS integration foundation** | **Implemented (foundation + demo adapter + export)** | Defines adapter interface/config, **clearly labeled synthetic demo adapter** (`CMMS_PROVIDER=demo`), status/sync API, maintenance export as JSON/CSV, and audit logging on sync attempts. Demo data is never presented as a real ERP connection. Real connectors are not implemented; configured mode reports that no real connector is active in this build. |
| **Unified integration status API** | **Implemented and locally verified** (code-level) | Canonical truthful capability snapshot in `src/modules/integrations/status.ts`, exposed via `GET /api/integrations/status` (canonical), `GET /api/integrations` (summary), and `GET /api/health`. Config presence does not imply verified external connectivity. |

## Demo/offline resilience (honest)
- A **Connectivity** banner shows browser online/offline state. **Server-dependent features** (diagnosis, uploads, manuals/maintenance APIs, saving records) require the app server to be reachable; browser “online” does not guarantee Gemini/API quota or connectivity.
- **Offline foundation (implemented, limited):** a conservative service worker is registered in production (`public/sw.js`). It **never caches `/api/*`** and provides navigation fallback to `/offline` with connectivity awareness. **No offline AI diagnosis** is claimed. The implemented sync capability is specifically a **local maintenance-note draft queue with explicit user-triggered sync** (ordinary technician notes only; idempotent/conflict-detecting; never modifies safety gate decisions, isolation/safe-to-touch status, maintenance/verification status/history, or `verified_resolved`). **This is not complete offline application functionality** and has **no background auto-sync**. Phase 4 browser E2E for offline/refresh/conflict/auth flows was **NOT TESTED** (resource constraints). Multi-tab localStorage last-write-wins remains a limitation.
- Maintenance records and manuals are stored locally by the prototype backend (JSON under `data/`, gitignored) when the server is running.

## Setup and installation

```bash
npm install
cp .env.example .env.local
# Edit .env.local (server-side values only; no NEXT_PUBLIC_ secrets)
npm run dev
```

PowerShell: `npm install; Copy-Item .env.example .env.local; npm run dev`

## Feature configuration notes

- **OCR (scanned/image-only PDFs):** KriyaOS detects scanned/low-text pages and can OCR only those pages, then merge extracted text by **original PDF page number** into chunking/retrieval/citations. OCR failures/partial completion are reported and no text/citations are fabricated. OCR text is untrusted manufacturer-document content and may be inaccurate.
  - **Real local engine (Windows/Node):** `OCR_ENABLED=true`, `OCR_PROVIDER=tesseract-local`, `OCR_LANGUAGE=eng` (default). Requires the **Tesseract OCR executable** and language data installed locally (no silent OCR model download by the app). If `tesseract` is not on PATH, set `OCR_TESSERACT_PATH` (e.g. `C:\Program Files\Tesseract-OCR\tesseract.exe`). If needed, set `OCR_TESSDATA_PREFIX` to the folder containing `*.traineddata`.
  - **Windows installation (real OCR):** 1) Install Tesseract for Windows (UB Mannheim build recommended: https://github.com/UB-Mannheim/tesseract/wiki). 2) During install, include **English** language data (`eng`); optionally add other languages. 3) Verify in PowerShell: `& "C:\Program Files\Tesseract-OCR\tesseract.exe" --version`. 4) Set `.env.local`: `OCR_ENABLED=true`, `OCR_PROVIDER=tesseract-local`, and `OCR_TESSERACT_PATH` if needed. 5) Restart `npm run dev` / server.
  - **Manual real-OCR verification:** upload a scanned/image-only PDF manual (text not selectable in a PDF viewer). The UI should show scanned pages detected and OCR page progress, then complete/partial/fail. Run diagnosis using that manual and confirm grounding/citations reference the correct manual title and **original page numbers**. Do not assume OCR text is accurate.
  - **Alternative HTTP OCR service:** `OCR_ENABLED=true`, `OCR_PROVIDER=http-service`, `OCR_SERVICE_URL=http://127.0.0.1:8001/ocr`. Contract: `{ pdfBase64, language, maxPages, pageNumbers?, preservePageNumbers }` -> `{ pages: [{ pageNumber, text }], engine?, warnings? }`.
  - **Limits/safety:** PDFs are validated (type/size/page count), never executed, and processed page-by-page for OCR with timeouts/resource cleanup. Use OCR only for scanned/low-text pages. English is supported initially; add Tesseract language data and set `OCR_LANGUAGE` for other languages (quality not guaranteed).
  - **Disable OCR:** set `OCR_ENABLED=false` or remove OCR vars. Scanned/image-only PDFs will be reported as OCR required.
  - **Troubleshooting:** "Tesseract executable not found" -> install Tesseract or set `OCR_TESSERACT_PATH`. "Error opening data file" / language errors -> install `eng.traineddata` (and others) and set `OCR_TESSDATA_PREFIX` if necessary. Timeouts/OOM on large scans -> reduce `OCR_MAX_PAGES`, split the PDF, or increase `OCR_TIMEOUT_MS` carefully. OCR unavailable/failed is reported clearly; no text is fabricated.
- **Local watchdog (advisory):** default `WATCHDOG_MODE=off`. Example local runtime: `WATCHDOG_MODE=local-runtime`, `WATCHDOG_URL=http://127.0.0.1:11434/api/generate`, `WATCHDOG_MODEL=gemma3:1b`. Advisory only; fails safely; never overrides deterministic BLOCK decisions.
- **Lyria/ambient audio hook (optional):** browser speech synthesis remains for spoken guidance. Ambient audio is disabled by default, user-requested only, never auto-generated during diagnosis, and not a safety feature/alarm/warning. Configure only with an authorized compatible endpoint (`LYRIA_ENABLED=true`, `LYRIA_MODE=custom`, `LYRIA_CUSTOM_URL`, optional `LYRIA_API_KEY`).
- **ERP/CMMS:** demo mode `CMMS_ENABLED=true`, `CMMS_PROVIDER=demo` uses clearly labeled synthetic data and does not contact a real ERP. Export local maintenance records via `/api/maintenance/export?format=json|csv` or the Maintenance UI. Real connectors require explicit implementation/configuration.
- **Persistence/auth foundations:** default persistence is local JSON under `data/` (gitignored). Optional SQLite maintenance persistence is implemented and selectable with `KRIYAOS_MAINTENANCE_STORE=sqlite` (optional `DATABASE_URL`, default `file:./dev.db`) but is **not live-verified** and not production-ready; manual/robotics data remain on JSON stores. Optional local auth (`AUTH_MODE=local`) is off by default and not production-ready.
- **Production architecture foundations:** env/config placeholders, validation/audit behavior, and partial local auth/DB foundations exist; full production hardening (complete route authorization, CSRF hardening, password/user management, multi-user isolation, full data migration/integrity guarantees) is not implemented.

## API endpoints (selected)

- `GET /api/health`, `POST /api/diagnose`
- `GET/POST /api/manuals`, `POST /api/manuals/upload`
- `GET/POST /api/maintenance`, `GET/POST /api/maintenance/[id]/*`, `GET /api/maintenance/export`
- `GET /api/integrations/status` (truthful capability matrix for all required integrations)
- `GET/POST /api/integrations/cmms`
- `GET/POST /api/safety/watchdog`
- `GET/POST /api/audio/lyria/status|generate`
- `GET/POST /api/auth/status|login|logout` (optional local auth foundation)

## Tests and build commands

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build   # constrained env: NODE_OPTIONS=--max-old-space-size=3072 npm run build
```

PowerShell build example: `$env:NODE_OPTIONS="--max-old-space-size=3072"; npm run build`

**Latest executed evidence (truthful):** Phase 3 executed targeted checks (no code changes Phase 4/5): `tsc --noEmit` PASS (exit 0); targeted ESLint PASS (0 errors/warnings, Phase 3 scope); `NODE_OPTIONS=--max-old-space-size=2048 npx vitest run src/lib/offline/maintenanceDraftQueue.test.ts src/app/api/integrations/integration-contracts.test.ts src/app/api/maintenance/draft-sync-safety.contract.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose` — **14 passed total** (8+5+1). Full `npm test`/full lint/full `npm run build` were **not** freshly executed in Phase 4/5 (resource-constrained: C: ~0.52 GB free). Prior baseline reported 109 passed/1 skipped and a constrained build pass — see `docs/FINAL_VALIDATION_REPORT.md` and `docs/FINAL_SUBMISSION_EVIDENCE_MATRIX.md`. Do not treat command listings as proof of a fresh pass.

## Security and safety limitations

- Use only synthetic or confirmed de-energized demo equipment.
- Deterministic safety gate is authoritative; AI/manuals/annotations/watchdog/audio cannot override BLOCK decisions.
- Camera/image/AI/watchdog cannot verify electrical isolation, energized state, safe-to-touch/open, or repair success.
- OCR may be incomplete/incorrect; scanned PDFs require configured OCR; no fabricated OCR text/citations.
- 2D camera overlay is not spatial AR tracking, depth, or measurement.
- CMMS demo is synthetic and never a real ERP connection.
- Auth/DB foundations are partial; no production-ready auth, multi-tenant isolation, or storage integrity guarantees are claimed.

## Manual testing checklist

- [ ] Setup/dev server works; Gemini diagnosis works with server key (missing key reported, no mock AI).
- [ ] Safety gate blocks dangerous/uncertain/live cases pre/post AI.
- [ ] Voice input/output work where supported; no auto-submit; blocked states handled safely.
- [ ] Text PDF grounding/citations work; scanned PDF reports OCR required or uses configured OCR; no fabricated content.
- [ ] Static annotations render/resize; 2D camera overlay is clearly labeled (not spatial AR tracking); unavailable/fallback states shown.
- [ ] Watchdog status/check behaves safely when disabled/unconfigured/failing/timed out; BLOCK never overridden.
- [ ] Ambient audio is disabled unless configured, user-requested only, and not a safety feature.
- [ ] Maintenance lifecycle/verification/audit/history works; blocked/dangerous cases cannot be `verified_resolved`; JSON/CSV export works.
- [ ] CMMS demo sync reports synthetic data clearly; optional local auth (if enabled) protects mutations.
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` pass.

## Google integration capability matrix (truthful, this build)

Status labels (Phase 4): **Implemented & verified** (where actually verified), **Implemented but requires credentials**, **Partially implemented**, **Not integrated**, **Planned**. Configuration variables do **not** imply verified external connectivity. The UI exposes these via **"Application & AI service status"** (`GET /api/integrations/status`).

| Technology | Status (truthful) | What is real in this build | How to enable / dependency | Verification note |
|---|---|---|---|---|
| **Gemini (diagnosis)** | Implemented, requires credentials | Server-side `@google/genai` diagnosis with Zod/structured validation, pre/post deterministic safety gates, graceful 429/rate-limit/timeout/malformed-output handling (no fabricated diagnosis). | `GOOGLE_AI_API_KEY` (server-side), optional `GEMINI_MODEL`, available quota/model access. | Key presence is not proof of success; real upstream 429 observed in configured environment; no successful AI response claimed without a real response. |
| **Gemini Live (real-time audio/video)** | Not integrated | No verified real-time Gemini Live audio/video integration in this build. | Official Gemini Live API support + credentials + implementation/verification. | Fallback: browser speech recognition/synthesis where supported; text always available. |
| **Nano Banana (image generation/editing)** | Partially implemented (fallback) | No verified Nano Banana/official image-generation-editing API integration. Validated SVG annotations + 2D camera overlay (advisory) preserve original image; callouts never claimed as verified repair instructions. | Official API access/credentials and verified implementation. | Fallback only; not Nano Banana API. |
| **Gemma / offline safety** | Partially implemented (advisory path exists; live inference not available in Phase 4) | Optional local-runtime watchdog (`WATCHDOG_MODE=local-runtime`) for text-only advisory classification; deterministic safety gate remains authoritative and never overridden. No browser Gemma model download/inference installed. **KriyaOS watchdog client tested with mocks (prior baseline).** **Phase 4 read-only (executed):** Ollama `0.40.15`, API responded, but `GET /api/tags` returned `{"models":[]}` (`gemma3:1b` not listed); **no live KriyaOS→Gemma inference evidence** (no inference attempted, no troubleshooting/download). | Local runtime endpoint/model (e.g., Ollama-compatible), `WATCHDOG_*` config. | Not a verified end-to-end local model integration; no electrical hazard detection claimed. |
| **Lyria (audio)** | Partially implemented / configurable hook | Browser speech synthesis for spoken guidance; optional user-requested ambient audio hook (`/api/audio/lyria/*`) when explicitly configured. Not a safety alarm; never auto-generated. | `LYRIA_ENABLED`, `LYRIA_MODE=custom`, `LYRIA_CUSTOM_URL`, optional endpoint auth. | Official Google Lyria access varies; no verified official endpoint claimed without config/access. |
| **Google Agent Skills / ERP workflow** | Partially implemented (local) | Local maintenance records, technician verification evidence/checklist, append-only audit trail, JSON/CSV export, CMMS demo adapter (synthetic, no real ERP contact). | Real Google Agent Skills/ERP connector would require supported APIs + authorization. | No real spare-parts/inventory orders; no real ERP connection. |
| **Firebase / BigQuery** | Not integrated | Local maintenance records work without cloud connectivity. No silent upload of images/audio/maintenance data. | Explicit authorized config/implementation (e.g., Firebase project/BigQuery dataset) with disclosure. | Not connected/verified; config presence alone is not treated as connected. |

## Proposal comparison note

No separate proposal/PRD file was found in the repository at implementation time (HEAD `AGENTS.md` contained only Next.js agent rules). This pass implemented/documented foundations for the specified remaining requirements: advisory local-runtime Gemma/watchdog integration (not faked browser model inference), configurable OCR integration architecture, honest 2D AR/camera-overlay fallback, optional/custom Lyria ambient audio hook (graceful unavailable), ERP/CMMS adapter/export foundation, and partial DB/auth production-architecture foundations. Features requiring specific runtime/browser/API/credentials/hardware access are reported as partial or blocked with honest limitations.

## Startup Buildathon India 2026 — submission summary

**KriyaOS — Safety-First AI Copilot for Industrial Field Maintenance**
*AI-assisted maintenance. Safety-controlled decisions.*

- **Problem:** Field maintenance guidance is risky when equipment status is unclear and manuals are hard to use; AI must not guess electrical safety.
- **Solution:** A web workbench for synthetic/confirmed de-energized solar inverter demos with deterministic safety gating (authoritative), fail-closed manual grounding + validated citations, advisory Gemini diagnosis when available (graceful fallback, no fabricated diagnosis), 2D advisory visual guidance, and maintenance verification/audit/export.
- **Google AI genuinely used:** **Google Gemini** (server-side `@google/genai`) for advisory diagnosis when `GOOGLE_AI_API_KEY`/quota/network allow. Other Google technologies in the blueprint are reported truthfully in the app as not integrated/partial/credential-dependent.
- **Safety:** Deterministic gate runs pre/post AI; BLOCK cannot be overridden. Camera/AI cannot verify electrical isolation or safe-to-touch status. Not certified for real electrical maintenance.
- **Full submission materials (problem, solution, users, architecture, innovation, capabilities, roadmap, 3-min/5-min scripts, judge Q&A):** see [`PRESENTATION.md`](./PRESENTATION.md) (§17) and [`DEMO.md`](./DEMO.md).
