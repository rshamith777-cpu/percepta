# KriyaOS — 8-Slide Presentation Deck

## Slide 1: Problem Statement
Solar inverter maintenance requires rigorous safety verification before any work. Technicians must confirm electrical isolation, de-energized state, and safe-to-touch conditions. Manual processes are error-prone, especially when working offline or in areas with limited connectivity. There is no reliable way to ensure deterministic safety decisions cannot be overridden by AI suggestions or background processes.

## Slide 2: Target Users and Pain Points
- **Solar technicians** working on rooftop/inverter systems needing safety verification
- **Maintenance teams** requiring offline-capable note-taking and sync
- **Compliance officers** needing auditable safety gate decisions
- **Pain points**: No offline draft persistence; AI cannot certify safe-to-touch; safety blocks might be bypassed; no conflict detection on sync; no audit trail for maintenance notes; background sync may overwrite local work.

## Slide 3: KriyaOS Solution
A Next.js-based solar inverter maintenance web application with:
- **Deterministic fail-closed safety gate** — BLOCK is authoritative; AI/advisory cannot override
- **Offline-first maintenance draft queue** — localStorage-backed, explicit sync only, conflict detection/resolution
- **Advisory-only Gemini/Local Ollama integration** — never overrides safety decisions
- **Truthful integration status** — all external integrations clearly marked unconfigured/disabled
- **Safety-preserving architecture** — no background sync, no implicit mutations, deterministic gate at every entry point

## Slide 4: System Architecture
```
Next.js UI (port 8080)          ←→ /api/health
                                    /api/maintenance [POST/GET]
                                    /api/maintenance/[id]/draft-notes/sync [POST]
                                    /api/integrations/status [GET]
                                    /sw.js [service worker, never caches /api/*]
                                    
Deterministic Safety Gate (authoritative)
        ↑                                              ↓
  Gemma/Ollama advisory (localhost, timeout)   Local CMMS simulator (synthetic only)
        ↑                                              ↓
  Truthful integration status                  Cloud Run (artifacts verified, not deployed)
```

## Slide 5: AI Advisory Workflow
1. Technician submits maintenance problem description
2. System passes to Gemini/Local Ollama via Ollama-compatible HTTP endpoint
3. Response returns as **advisory only** — never used to override safety gate
4. Deterministic safety gate evaluates problem description
5. If BLOCK → all further processing halted, record marked `diagnosisBlocked: true`
6. If ALLOW → draft notes may be created; sync is explicit user-triggered only
7. All advisory output labeled "advisory only; deterministic safety gate remains authoritative"

## Slide 6: Deterministic Safety Gate and Fail-Closed Design
- **BLOCK is absolute** — verified by Test 14: "BLOCK cannot be bypassed (blocked record: notes sync does not change block/safety/verification)"
- **Fail-closed** — any uncertainty triggers BLOCK, not allow
- **No AI certification** of isolation or safe-to-touch conditions
- **Maintenance lifecycle** prevents blocked cases from becoming `verified_resolved`
- **Safety state preservation** — after draft sync, `diagnosisBlocked`, `status`, `currentVerification`, `verificationHistory` all remain unchanged (Test 15)
- **Synthetic equipment only** — all demo uses confirmed de-energized/mock data

## Slide 7: Offline Maintenance Notes and Explicit Synchronization
- Drafts stored in localStorage — survive offline periods
- **No background or implicit sync** — reconnect does not auto-sync (Test 16)
- **Explicit sync only** — user clicks "Sync now (explicit)"
- **Idempotent** — duplicate sync prevented via idempotency key (Test 7)
- **Conflict detection** — if server version differs, conflict UI appears; `syncState: conflict` set in localStorage (Test 8)
- **Failed sync retention** — `syncState: sync_failed`; draft data preserved (Test 10)
- **Corrupted storage handling** — if localStorage is corrupted, UI refuses overwrite and preserves raw data (Test 12)

## Slide 8: Demo CMMS and Integration Status
- **CMMS**: Local simulator/adapter only — synthetic data, JSON/CSV export formats, `mode: disabled`, `provider: none`, `hasCredentials: false`
- **All external integrations truthfully statused**:
  - Gemini diagnosis: `unconfigured` (server-side `@google/genai` scaffold only)
  - Gemini Live: `unconfigured` (foundation only, no realtime bridge)
  - Nano Banana: not implemented (honest 2D annotation fallback only)
  - Lyria: not implemented (custom hook/speech, not official Lyria)
  - Agent Skills: not integrated (placeholder only)
  - Firebase/Firestore: unconfigured (no SDK/init/read/write/upload)
  - BigQuery: schema validation only, no external ingest
- **Cloud Run**: Build artifacts verified (Dockerfile, standalone output, `/api/health`) — **not deployed**

## Slide 9: Testing and Validation Evidence
- **123/123 Vitest passed** across 17 test files (constrained run: `NODE_OPTIONS=--max-old-space-size=2048`, `--maxWorkers=1 --no-file-parallelism`)
- **17/17 Playwright E2E passed** — offline maintenance-note workflow (15 scenarios: online draft, offline draft, refresh while offline, pending queue, reconnection, explicit sync, idempotency, conflict detection/resolution, failed sync retention, draft removal, corrupted storage, safety unchanged, BLOCK non-bypassable, notes-only mutation, no background sync, SW API contract)
- **Watchdog 7/7 passed** — BLOCK precedence, timeout handling, error handling, heuristic classification
- **TypeScript**: `tsc --noEmit` exit 0
- **ESLint**: 0 errors, 0 warnings on changed files
- **Production build**: `npm run build` exit 0; `.next` ~120.5 MB in D:
- **Safety invariants preserved** — no gate changes, BLOCK precedence maintained, no AI certification of safety

## Slide 10: Future Roadmap and Limitations
- **Short-term**: Manual browser E2E validation; Gemma end-to-end evidence with Ollama runtime; credential-gated integrations with explicit approval
- **Medium-term**: Gemini Live realtime session (with `GOOGLE_AI_API_KEY` and Live API access); official Nano Banana/Lyria/Agent Skills integrations (with credentials); Firebase/Firestore with emulator-prod rules; BigQuery with validated schema and parameterized queries
- **Long-term**: Cloud Run deployment (with Docker, gcloud, project, billing authorization); real ERP/CMMS connector (with official API, sandbox, human approval); full reliable sync with conflict UI; multi-tab conflict strategy; durable DB migration
- **Ongoing**: Truthful integration status; deterministic safety gate preservation; advisory-only AI workflow; synthetic equipment only for all demonstrations