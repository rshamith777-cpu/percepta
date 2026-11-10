# KriyaOS — Presentation Package

**Tagline:** Safety-first, AI-assisted solar inverter repair guidance for **synthetic or confirmed de-energized** demo equipment.

> **Demo/safety scope:** KriyaOS is a prototype. Use **synthetic or confirmed de-energized equipment only**. It is **not** certified for real electrical maintenance and **not** a replacement for lockout/tagout (LOTO), qualified technician judgment, approved procedures, or emergency response. AI, camera, image, voice, watchdog, OCR, annotation, and audio outputs are advisory/informational where applicable and can be wrong.

## 1) Project title and tagline
- **Project:** KriyaOS
- **Tagline:** A safety-first industrial repair assistant prototype for solar inverter maintenance, combining deterministic safety gating, manual grounding with validated citations, and advisory AI diagnosis.

## 2) Problem statement
Solar inverter maintenance guidance can be high-risk when technicians face unclear equipment status, missing or hard-to-search manuals, and unreliable advice under time pressure. A useful assistant must **not** guess about electrical safety: it should escalate dangerous or uncertain conditions, ground advice in relevant manufacturer documentation when available, and make limitations explicit.

## 3) Target users and use case
- **Target users (prototype/demo):** technicians, trainees, and maintainers working with **synthetic or confirmed de-energized** solar inverter demo equipment; educators/reviewers evaluating safety-aware repair workflows.
- **Use case:** capture an equipment image, describe the observed issue (text or browser voice input), run deterministic safety checks, retrieve relevant manual passages, request advisory AI diagnosis when available, and record maintenance/verification evidence with audit history.

## 4) Solution overview
KriyaOS is a web-only Next.js (TypeScript + React + Tailwind) technician workbench. Its core design principle is **safety independence**: the **deterministic safety gate is authoritative** and runs before and after AI. Manual retrieval is fail-closed and citation-grounded (validated citations only). External AI (Gemini) is optional for real diagnosis responses and degrades gracefully on quota/rate-limit errors without fabricating results.

## 5) Architecture and technology stack

| Layer | Implementation (verified in repo) |
|---|---|
| Web app | Next.js 16.4.5 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS 4 |
| Validation/contracts | Zod schemas/types; server-side request/response validation |
| AI diagnosis | `@google/genai` (Gemini) server-side only (`GOOGLE_AI_API_KEY`); model configurable via `GEMINI_MODEL` (default `gemini-3.8-flash` in code) |
| Manual processing | PDF upload/list; `pdf-parse`/`pdfjs-dist`; chunking; local lexical retrieval; server-side citation validation |
| OCR (optional) | Real local Tesseract CLI provider + HTTP OCR service fallback; scanned/low-text pages only; no fabricated OCR text |
| Safety | Deterministic pre/post safety gate; advisory watchdog integration (optional local runtime); ambient audio hook (optional, non-safety) |
| UI/workbench | Diagnosis workbench, safety checklist, manual library, validated SVG annotations, 2D camera overlay fallback, voice input/output controls, maintenance panel |
| Persistence foundations | Local JSON stores under `data/` (gitignored); SQLite migration foundation (`node:sqlite`, experimental/partial); optional local auth foundation (off by default, not production-ready) |
| Integrations | CMMS/ERP adapter foundation with **clearly labeled synthetic demo adapter**; JSON/CSV maintenance export |
| Tests/build | Vitest; ESLint; TypeScript (`tsc --noEmit`); production build via `next build` (build uses `tsconfig.build.json`); constrained-memory build supported with `NODE_OPTIONS=--max-old-space-size=3072` |

## 6) Key features and workflow

1. **Set demo safety context:** select equipment status and complete the safety checklist (synthetic or confirmed de-energized only).
2. **Provide input:** upload/capture an image and describe the observed problem (text; optional browser voice input, no auto-submit).
3. **Safety pre-check (authoritative):** server runs deterministic safety evaluation before AI. Unsafe/uncertain/live cases **BLOCK** with safe escalation.
4. **Manual grounding (fail-closed):** eligible manuals are retrieved; passages are reference data only. Irrelevant documents (e.g., HR/offer/admin) are marked not grounding-eligible. Candidate retrieval is separate from validated grounding.
5. **Advisory diagnosis (if available):** Gemini is called only after the pre-gate allows. Responses are validated; post-gate runs on model output. If Gemini is unavailable (e.g., 429 quota), KriyaOS shows a clear error/fallback without fabricating diagnosis and keeps independent `safetyDecision`/`manualContext` visible.
6. **Results:** advisory diagnosis, safety notices, image limitations, validated visual annotations (SVG; 2D camera overlay fallback), and citation-grounding status.
7. **Maintenance/verification:** local maintenance records, repair attempts, technician verification evidence/checklist, append-only audit history; blocked/dangerous cases cannot be recorded as `verified_resolved`.

## 7) Deterministic safety gate and why it is independent of AI
- **Authoritative:** The deterministic safety gate evaluates structured inputs and known risk patterns using explicit rules. It runs **before Gemini** (pre-gate) and **after Gemini** (post-gate) on model output.
- **Independence:** AI/manuals/annotations/watchdog/audio **cannot override** a BLOCK decision. A BLOCK prevents repair guidance and triggers **safe escalation**.
- **No false safety verification:** Camera, image, and AI **cannot** verify electrical isolation, energized state, or safe-to-touch conditions. KriyaOS does not claim “safe-to-touch” or real-world isolation from vision/AI.
- **Demo constraints:** Synthetic or confirmed de-energized equipment only; no live electrical work, no opening energized equipment, no touching live components.
- **Graceful degradation:** If AI is unavailable, the safety decision and manual context remain independent and visible; no diagnosis is fabricated.

## 8) Manual retrieval and citation-grounding design
- **Upload & extraction:** PDFs are processed server-side with page-aware extraction; scanned/low-text pages can use configured OCR (optional). OCR text is untrusted and may be inaccurate.
- **Relevance filtering (fail-closed):** Documents are assessed for inverter/electrical service grounding relevance. Clearly unrelated documents (HR/offer/internship/fundraising/recruitment/admin, etc.) are saved as **not grounding-eligible** and cannot ground diagnosis. Legacy records lacking explicit relevance metadata are migrated fail-closed.
- **Retrieval:** Local lexical retrieval returns candidate passages (reference data only, never system instructions).
- **Citation validation:** Grounded diagnosis requires **validated citations** that match retrieved manual title, original page number, and supporting passage. Unsupported claims remain ungrounded; no citations or grounding are fabricated.
- **UI transparency:** The workbench separates **candidate retrieved passages** from **validated grounding/citations**.

## 9) Synthetic/de-energized demo scenario
1. Confirm the equipment is **synthetic demo hardware** or **confirmed de-energized** by qualified verification outside the app.
2. Set equipment status accordingly and complete safety-critical checklist items.
3. Upload a clearly labeled synthetic test image and describe the issue (synthetic/de-energized demo).
4. Run “Safety gate & analyze.”
5. Expected: deterministic gate allows or escalates based on inputs; if Gemini is available, an advisory diagnosis appears with safety notices/limitations; if Gemini returns 429, a clear labeled fallback appears with **no fabricated diagnosis** and independent safety/manual context.

## 10) Testing and validation results (verified)

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | No TypeScript errors reported. |
| `npm run lint` | **PASS** | ESLint completed without reported errors. |
| `npm test` (Vitest) | **PASS** | 13 test files, **105 tests passed, 1 skipped**. Skipped: real OCR test (`Tesseract executable not found`). |
| `NODE_OPTIONS=--max-old-space-size=3072 npm run build` | **PASS** | Production build completed (static/dynamic routes generated). |
| Production browser preview (Chromium) | **Verified (clean console in tested session)** | Workbench, safety notices, manual relevance/grounding UI, watchdog/audio/maintenance panels rendered; no React #418 observed after hydration-safe capability fix. |

**Not verified in this session:** live Gemini successful diagnosis (quota/rate limit `429` observed in configured environment), real OCR end-to-end with installed Tesseract, native camera/microphone permission flows across devices/browsers, mobile/cross-browser QA, and any real manufacturer manual validation.

## 11) Limitations and future scope
- **Gemini dependency:** Real AI diagnosis requires server-side API key and available quota/model access; 429/quota errors may occur.
- **OCR dependency:** Scanned PDFs require Tesseract or configured HTTP OCR service; OCR can be incomplete/incorrect.
- **Camera/browser dependency:** Permission/device support varies; camera/voice are not universal. Camera/AI cannot verify electrical safety.
- **Not spatial AR:** 2D camera overlay is advisory only—no tracking, depth, measurements, or safe-zone visuals.
- **CMMS/ERP:** demo adapter only (synthetic), no real ERP connector/production sync guarantees.
- **Production foundations partial:** SQLite/local auth/migrations exist as foundations but are **not production-ready** (no full data cutover, complete authorization/CSRF hardening, password/user management guarantees, multi-tenant isolation, or storage integrity guarantees).
- **Not certified:** Prototype only; no real electrical maintenance, no LOTO replacement, no manufacturer validation.

**Future scope (non-binding):** production hardening (authz/CSRF/storage migration), verified local inference/runtime options, manufacturer-validated manual/citation workflows with authorized sources, robust device/browser QA, and real CMMS connectors with explicit security review.

## 12) Feature status (claim discipline)

| Area | Status | Disclosure |
|---|---|---|
| Deterministic safety gate (pre/post, authoritative BLOCK/escalation) | **Implemented and verified** (tests + browser/UI observed) | Cannot verify real electrical isolation/energized/safe-to-touch. |
| Manual upload/list/relevance filtering/fail-closed grounding/citation validation | **Implemented and verified** (tests + UI observed) | No bundled real manufacturer manual; OCR/external docs affect quality. |
| Diagnosis workflow UI, checklist, maintenance/audit foundations, exports | **Implemented and verified** (tests + UI/build observed) | Local prototype persistence; not production CMMS. |
| React hydration #418 fix (browser capability detection) | **Implemented and verified** (production preview console clean) | External preview tooling may inject DOM outside app; not an app defect fixed here. |
| Gemini advisory diagnosis | **Implemented but externally dependent** | Requires valid server-side key + quota/model access; 429 observed in configured environment; no fabricated diagnosis on failure. |
| Scanned PDF OCR (Tesseract/HTTP) | **Implemented but externally dependent** | Requires installed/configured OCR engine/service; real OCR test skipped when Tesseract unavailable. |
| Voice input/output (browser APIs) | **Implemented but externally dependent** | Browser/device support varies; advisory only. |
| Local watchdog integration | **Prototype/foundation (advisory)** | Requires configured local runtime; never overrides deterministic gate. |
| Ambient audio/Lyria hook | **Prototype/foundation (optional, non-safety)** | Disabled unless explicitly configured; user-requested only. |
| 2D camera overlay annotations | **Prototype/foundation (honest fallback)** | Not spatial AR, no tracking/depth/measurements/safety verification. |
| CMMS/ERP integration | **Prototype/foundation (demo adapter + export)** | Synthetic demo only; no real ERP connection. |
| SQLite/auth production foundations | **Prototype/foundation (partial)** | Not production-ready; defaults unchanged. |
| Real spatial AR, real CMMS/ERP connector, manufacturer-validated diagnosis, certified electrical safety | **Not implemented** | Must not be claimed. |

## 13) 5-minute demo script (timestamps)

### 0:00–0:30 — Introduction / problem
- “KriyaOS is a safety-first prototype for solar inverter repair guidance, designed for **synthetic or confirmed de-energized** demo equipment only.”
- Problem: technicians need help interpreting symptoms and manuals, but electrical safety cannot be guessed. KriyaOS separates **authoritative safety decisions** from advisory AI.

### 0:30–1:15 — Safety-first architecture
- Walk the workbench: equipment status, safety checklist, image/description input, manual grounding, and maintenance panels.
- Explain: deterministic safety gate runs **before and after AI**. AI/manuals/annotations/watchdog/audio cannot override BLOCK. Camera/AI cannot verify isolation or safe-to-touch.

### 1:15–2:00 — Demonstrate safety BLOCK / escalation
- Set status to **Uncertain / not confirmed** or **Potentially live / energized** (or present a hazardous/unclear scenario).
- Submit the request. Show **BLOCK** and **safe escalation** with no repair guidance.
- State clearly: “The system escalates safely instead of giving risky steps.” Do not suggest live electrical work.

### 2:00–3:00 — Synthetic/de-energized workflow and checklist
- Switch to **Synthetic demo hardware** or **Confirmed de-energized** and complete required safety-critical checklist items.
- Use a clearly labeled synthetic/de-energized demo image and description.
- Submit. Explain expected behavior: advisory output only if AI is available; safety notices and image limitations remain visible.

### 3:00–4:00 — Manual relevance / grounding
- Open Manual Library. Show an irrelevant document marked **not suitable for grounding** (e.g., the stored legacy offer letter example if present) with reason and removal option.
- Explain: fail-closed relevance/eligibility; only eligible manuals can ground diagnosis. Candidate retrieved passages are **reference data**; validated citations require matching title/page/supporting passage. No fabricated citations. Use a legitimate authorized manual or clearly labeled synthetic fixture for real grounding demos.

### 4:00–4:30 — Maintenance / audit foundations
- Show maintenance records panel: local prototype records, technician-entered verification/evidence concepts, append-only audit/export foundations.
- Clarify: blocked/dangerous cases cannot be marked `verified_resolved`; verification is **not** AI/camera safety certification.

### 4:30–5:00 — Limitations, impact, conclusion
- Impact: demonstrates a safer pattern for industrial AI assistance—**safety gate independent of AI**, transparent grounding, graceful degradation.
- Limitations: Gemini quota/model dependency (429 possible), OCR/camera/browser dependencies, 2D overlay is not spatial AR, CMMS demo is synthetic, production auth/storage foundations are partial, not certified for real electrical maintenance.

## 14) Backup plan if Gemini is unavailable (429)
- **Do not** retry quota-limited requests repeatedly, change models, or change API credentials to bypass quota. **Do not** invent an AI diagnosis or claim a successful AI run.
- **If a clearly labeled 429/fallback is already visible** from a prior legitimate attempt: show it and explain: “Gemini returned a real upstream quota/rate-limit error; KriyaOS did not fabricate a diagnosis.”
- **If not visible:** do **not** make new Gemini calls. Demonstrate the **safety-first value** without AI:
  1. Run the **Safety BLOCK/escalation** scenario (deterministic, no Gemini required).
  2. Show **manual relevance/grounding UI** and fail-closed eligibility (no AI required).
  3. Explain that in the synthetic/de-energized workflow, when AI is unavailable the UI preserves **independent `safetyDecision` and `manualContext`** and shows an actionable error; this was verified by real API evidence (429 `RATE_LIMITED`, quota exceeded) in the configured environment.
- **Disclosure to say out loud:** “Gemini is implemented but externally dependent on key/quota/model access. The deterministic safety gate and manual grounding controls remain independent of AI.”

## 15) Concise slide outline (10 slides)

1. **Title** — KriyaOS: Safety-first AI-assisted solar inverter repair (synthetic/confirmed de-energized demo only).
2. **Problem** — High-risk maintenance guidance; unclear status; manuals hard to use; AI must not guess safety.
3. **Target users & use case** — Technicians/trainees on safe demo equipment; capture → safety gate → grounding → advisory diagnosis → maintenance record.
4. **Solution overview** — Web workbench; deterministic safety first; advisory AI; fail-closed manual grounding; graceful degradation.
5. **Architecture & stack** — Next.js/React/TS/Tailwind/Zod; server-side Gemini; PDF retrieval/citation validation; local persistence; optional OCR/watchdog/audio hooks.
6. **Safety gate (independent of AI)** — Pre/post deterministic checks; BLOCK overrides all; safe escalation; camera/AI cannot verify isolation.
7. **Manual grounding & citations** — Relevance/eligibility fail-closed; candidate retrieval ≠ validated grounding; title/page/passage-validated citations only.
8. **Demo workflow** — BLOCK scenario + synthetic/de-energized scenario; Gemini 429 backup plan (no fabrication, no repeated quota calls).
9. **Validation results** — tsc/lint/build PASS; 105 tests passed/1 skipped (OCR env); browser preview verified (no #418). External dependencies noted.
10. **Limitations & future scope** — Not certified; Gemini/OCR/browser dependencies; 2D overlay not spatial AR; CMMS demo only; partial prod foundations; future hardening/validated integrations.

## 16) Claims corrected in documentation (this pass)
- `DEMO.md`: Updated browser verification note to reflect **production browser preview verified** (console clean, key UI panels rendered) while keeping the recommendation to run a manual pass before presenting and preserving unverified external-dependency caveats.
- `PRESENTATION.md` (new): Consolidated claims with explicit status labels (implemented and verified / implemented but externally dependent / prototype/foundation / not implemented) and honest Gemini 429 backup behavior.

---

## 17) Submission summary (Startup Buildathon India 2026)

**Project:** KriyaOS  
**Positioning:** Safety-First AI Copilot for Industrial Field Maintenance  
**Tagline:** AI-assisted maintenance. Safety-controlled decisions.  
**Prototype focus:** Solar inverter maintenance (synthetic or confirmed de-energized demo only). Not certified for real electrical maintenance.

### Problem statement
Industrial field maintenance (e.g., solar inverters) is high-risk when equipment status is unclear, manuals are hard to search, and guidance arrives under time pressure. A helpful copilot must **not** guess about electrical safety: it must escalate dangerous/uncertain conditions, ground advice in relevant documentation when available, and be honest about limits.

### Proposed solution
KriyaOS is a web-based technician workbench that combines image/text (and optional browser voice) input, **deterministic safety gating** (authoritative, pre/post AI), **fail-closed manual grounding** with validated citations, advisory AI diagnosis (when available), 2D advisory visual guidance, and local maintenance verification/audit/export. External AI is optional and never overrides safety.

### Target users
- **Primary (prototype):** field technicians/trainees working on **synthetic or confirmed de-energized** solar inverter demo equipment; maintenance supervisors reviewing documentation.
- **Secondary:** educators/evaluators assessing safety-aware industrial AI workflows.
- **Not a target for live use:** anyone performing work on energized/unknown-status equipment without qualified procedures.

### Technical architecture (actual)
- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind (mobile-first workbench).
- **APIs (server):** `/api/diagnose`, `/api/manuals*`, `/api/maintenance*`, `/api/integrations/status`, `/api/integrations/cmms`, `/api/safety/watchdog`, `/api/audio/lyria/*`, `/api/health`, optional auth foundations.
- **AI:** server-side **Google Gemini** via `@google/genai` (`GOOGLE_AI_API_KEY`, optional `GEMINI_MODEL`), Zod-validated structured output, timeouts/sanitized errors, graceful 429/quota fallback (**no fabricated diagnosis**).
- **Safety:** deterministic `safetyGate` runs **before and after** AI; BLOCK is authoritative; camera/AI cannot verify isolation/safe-to-touch.
- **Manuals/RAG:** PDF extraction, relevance/eligibility filtering (fail-closed), lexical retrieval (reference data only), **server-side citation validation** (title/page/passage); optional OCR (Tesseract/HTTP service).
- **Persistence:** local JSON stores under `data/` (gitignored); SQLite/auth foundations partial; CMMS **local simulator** (synthetic demo), JSON/CSV export.

### Innovation and differentiation
- **Safety-controlled decisions:** deterministic gate is independent of AI and cannot be overridden by models, manuals, voice, camera, OCR, or annotations.
- **Honest grounding:** candidate retrieval is separated from **validated** grounding; irrelevant documents are blocked from grounding; no fabricated citations.
- **Graceful degradation:** Gemini quota/missing-key/network failures preserve independent safety/manual context and never fabricate diagnoses.
- **Truthful integration status:** UI/API report capability states without claiming “connected” from config alone.
- **Auditability:** technician-entered verification evidence, append-only audit history, export; blocked cases cannot be marked resolved.

### Google AI technologies genuinely used
| Technology | Genuine use in this build | Dependency / honesty |
|---|---|---|
| **Google Gemini** (Generative AI) | **Yes, implemented:** server-side advisory diagnosis via `@google/genai` with structured validation and safety pre/post checks. | Requires `GOOGLE_AI_API_KEY` and available quota/model access/network. 429/rate limits possible; handled gracefully. No successful response claimed without a real response. |
| Gemini Live, Nano Banana/Imagen image gen-edit APIs, Gemma browser inference, Lyria official API, Google Agent Skills | **Not implemented/verified** as real integrations in this build. | Reported truthfully as not integrated/partial/fallback/config-hook where applicable. |

### Safety architecture (summary)
1. User sets equipment status + checklist (synthetic/confirmed de-energized context required for non-escalation flows).
2. **Pre-gate (deterministic):** blocks dangerous/uncertain/live patterns → safe escalation, no repair guidance.
3. Manual retrieval (if eligible) provides **reference data only**; citations validated server-side.
4. Gemini (if configured/available) returns advisory structured diagnosis; **post-gate** checks output.
5. UI shows safety notices, image limitations, grounding status, and advisory annotations. **Maintenance:** blocked/dangerous diagnoses cannot be `verified_resolved`; verification is technician-entered, not AI/camera certification.

### Current capabilities (verified / implemented)
- Deterministic safety BLOCK and safe escalation (API-verified).
- Image upload/camera capture UI + server diagnosis pipeline; graceful Gemini fallback (no fabricated diagnosis).
- Browser voice input/output (EN/HI/KN locale hints), **no auto-submit**.
- Manual upload/relevance filtering/fail-closed grounding and citation validation.
- 2D advisory annotations/camera overlay fallback (not spatial AR, not safety certification).
- Maintenance records, verification checklist/evidence/confirmation, append-only audit, JSON/CSV export; blocked cases cannot be verified resolved.
- Truthful integration status panel/API; CMMS local simulator (synthetic, no real ERP/orders).
- Checks: `tsc`/`lint`/Vitest/build passing in this environment (see test results); production browser smoke checks completed earlier.

### Honest future roadmap (not commitments)
- Real credentialed/quota-stable Gemini operations and broader evaluation on authorized datasets.
- Verified Gemini Live / official image/audio integrations only with supported access and tests.
- True offline-capable architecture (service worker + cached/synced data) with explicit scope; no offline AI claims without real local inference.
- Real CMMS/ERP connectors only with authorization; production auth, storage, RBAC, and security hardening.
- Manufacturer-validated manuals/citations and qualified field review (outside prototype scope).

### 3-minute demo script (judge)
1. **0:00–0:35** Open workbench: show safety disclaimers, Connectivity, Integration Status (truthful). Explain: *AI-assisted maintenance, safety-controlled decisions*.
2. **0:35–1:15** **Safety BLOCK:** set *Potentially live/Uncertain* or unsafe checklist → submit → deterministic block + safe escalation (no repair guidance).
3. **1:15–2:10** **Safe flow:** *Confirmed de-energized/synthetic* + checklist + image/description (+ voice locale if desired). If Gemini 429/missing-key: show graceful fallback, **no fabricated diagnosis**, independent safety/manual context. If Gemini succeeds: show advisory result.
4. **2:10–2:40** **Grounding + visual guidance:** manual relevance/fail-closed; candidate retrieval ≠ validated grounding. 2D annotations/advisory only.
5. **2:40–3:00** **Maintenance/audit/export + limits:** verification evidence, audit history, JSON/CSV; CMMS local simulator (synthetic). Close with honest limitations (no certification, no isolation verification, quota-dependent AI).

### 5-minute presentation script
Use **Section 13** (0:00–5:00 demo script) plus **Section 14** (Gemini 429 backup plan). Emphasize: deterministic safety independence, fail-closed grounding, graceful degradation, truthful integration labels, and local auditability. Do not claim production readiness, certifications, real ERP, or complete Google blueprint integration.

### Common judge questions (concise, honest)
**Q: Does the AI decide if equipment is safe?**  
A: No. A **deterministic safety gate** is authoritative. It blocks unsafe/uncertain/live cases before/after AI. Camera/AI cannot verify electrical isolation or safe-to-touch status.

**Q: What happens if Gemini is down or quota-limited?**  
A: KriyaOS returns a clear fal
lback with **no fabricated diagnosis**, while preserving independent safety decision and manual context. The safety gate does not depend on Gemini.

**Q: Are manual citations real?**  
A: Citations are shown only when server-side validation confirms they match retrieved manual title, original page, and supporting passage. Irrelevant manuals are blocked from grounding; unsupported claims remain ungrounded.

**Q: Which Google AI technologies do you actually use?**  
A: **Google Gemini** (server-side, `@google/genai`) for advisory diagnosis when credentials/quota are available. Gemini Live, Nano Banana/official image APIs, Gemma browser inference, Lyria official, Agent Skills, Firebase/BigQuery are **not verified/integrated** as complete real integrations in this build (status shown truthfully).

**Q: Is this production-ready or certified?**  
A: No. It’s a safety-first prototype for **synthetic or confirmed de-energized demos only**. No electrical safety certification, no isolation verification, and production auth/storage/hardening are incomplete.

**Q: Can it place real spare-parts/ERP orders?**  
A: No. CMMS is a **clearly labeled local simulator** with synthetic demo data and local exports. No real ERP contact or external orders.

**Q: Does it work offline?**  
A: Partially/honestly: connectivity awareness is shown; safety guidance on screen remains visible. **No offline AI diagnosis**. Full offline app/data caching (service worker) is not implemented; manuals/records require the running backend.

**Q: What was actually tested?**  
A: `tsc`, lint, Vitest, and production build passed in this environment; safety BLOCK and maintenance verification/export workflows were API-verified earlier; production browser smoke checks showed key UI and clean console in tested sessions. Gemini runtime success depends on quota/credentials.
