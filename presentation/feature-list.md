# KriyaOS — Feature List

## Implemented and Verified
- ✅ Deterministic fail-closed safety gate with BLOCK absolute precedence
- ✅ Offline-first maintenance draft queue (localStorage, origin-scoped)
- ✅ Explicit sync only — no background or implicit sync on reconnect
- ✅ Idempotent sync via idempotency key (prevents duplicate application)
- ✅ Conflict detection and resolution (conflict UI, syncState: conflict)
- ✅ Failed sync retention (syncState: sync_failed, draft data preserved)
- ✅ Corrupted localStorage handling (preserves raw data, refuses overwrite)
- ✅ Safety state preservation after draft sync (diagnosisBlocked, status, currentVerification, verificationHistory unchanged)
- ✅ BLOCK cannot be bypassed (verified by E2E Test 14 and contract test)
- ✅ Notes-only server mutation (only technicianNotes and auditEvents.update change; safety fields immutable — verified by E2E Test 15)
- ✅ Truthful integration status (all areas marked unconfigured/disabled/blocked)
- ✅ Advisory-only AI integration (Gemina/Local Ollama, never overrides safety)
- ✅ Production build (npm run build exit 0, .next in D:)
- ✅ TypeScript tsc --noEmit exit 0
- ✅ ESLint 0 errors, 0 warnings
- ✅ Vitest 123/123 passed (17 test files)
- ✅ Playwright E2E 17/17 passed (offline maintenance-note workflow)
- ✅ Watchdog 7/7 passed (BLOCK precedence, timeout, error, heuristic)
- ✅ C: repository untouched (no commits, pushes, modifications)
- ✅ Disk space: C: ~6 GB free, D: ~241 GB free (above 400 MB minimum)

## Scaffold/Foundations (not live-verified)
- Gemini diagnosis server-side scaffold (@google/genai, no live key)
- Gemini Live foundation only (honest status endpoint, no realtime bridge)
- Nano Banana honest 2D annotation/camera-overlay fallback (not official API)
- Lyria custom hook/browser speech fallback (not official Lyria)
- Google Agent Skills status endpoint only (no official integration)
- Firebase/Firestore config hints only (no SDK/init/read/write/upload)
- BigQuery schema validation only, no external ingest (performed:false, acceptedForValidationOnly:true)
- Cloud Run build artifacts verified (Dockerfile, standalone output, /api/health) — not deployed
- Local CMMS simulator/export foundations (JSON/CSV, synthetic only)

## Not Implemented
- Official Gemini Live realtime audio/video bridge
- Official Nano Banana image generation/editing API
- Official Lyria audio generation API
- Google Agent Skills official integration
- Firebase/Firestore persistence with SDK/emulator/prod rules
- BigQuery external event ingestion
- Real ERP/CMMS connector (official API, sandbox, human approval)
- Cloud Run actual deployment (no Docker/gcloud/authorization)
- Full reliable sync with server-mediated conflict resolution beyond draft notes