# KriyaOS — Limitations and Honest Integration Status

## Current Limitations

### 1. No Production Deployment
- Cloud Run build artifacts verified (Dockerfile, standalone output, /api/health) but **not deployed**
- No Docker build/run in this environment; no gcloud, no project, no billing authorization
- No billable resources created or deployed

### 2. No Live External Integrations
- **Gemina Live**: No realtime audio/video bridge; requires `GOOGLE_AI_API_KEY` and Live API access
- **Official Nano Banana**: Not implemented as official API; only honest 2D annotation/camera-overlay fallback
- **Official Lyria**: Not implemented; custom hook/speech fallback exists but is not Lyria
- **Agent Skills**: No official supported integration; placeholder status endpoint only
- **Firebase/Firestore**: No SDK init/read/write/upload; config hints only; no verified project credentials
- **BigQuery**: Schema validation only; `performed:false`, `acceptedForValidationOnly:true`; no external ingest
- **Real ERP/CMMS**: No official connector; local simulator/adapter only; no real API calls

### 3. AI Safety Constraints
- AI output **never** certifies equipment as safe to touch
- Deterministic safety gate **always** authoritative; BLOCK cannot be overridden by UI, AI, offline sync, or CMMS
- All synthetic equipment only; no live hardware connected
- No electrical safety claims from any AI output

### 4. Browser E2E Re-run Pending
- 17/17 E2E tests passed in prior session against dev server on port 3100
- Re-run completed against standalone server on port 8080 — all 17 passed
- Full 11-scenario offline sync validation would require additional browser-based test coverage

### 5. Resource Constraints
- C: ~6 GB free (adequate for dev server and E2E, above 400 MB minimum)
- D: ~241 GB free (sufficient for all operations, model caches, builds)
- No Docker or gcloud installed in this environment
- Ollama model gemma3:1b at default C:\Users\ddsai\.ollama\models\ (769 MB); D:\OllamaModels\ empty (placeholder)

## Honest Integration Status (All Truthful, No "Green Connected")

| Integration | Status | Evidence |
|---|---|---|
| Gemini diagnosis | `unconfigured` | Server-side @google/genai scaffold; no live quota test |
| Gemini Live | `unconfigured` | Foundation only; honest status endpoint; no realtime session |
| Nano Banana | `not implemented` | Honest 2D annotation fallback only; no official API |
| Lyria | `not implemented / hook only` | Custom ambient hook, not official Lyria |
| Agent Skills | `not integrated` | Placeholder status endpoint only |
| Firebase/Firestore | `unconfigured` | No SDK, emulator-prod creds, or verified ops |
| BigQuery | `unconfigured` | Schema validation only, no ingest (`performed:false`) |
| Cloud Run | `build_verified_not_deployed` | Dockerfile + standalone output present; not deployed |
| ERP/CMMS | `blocked (no real connector)` | Local simulator/adapter only; no official API |

## Future Roadmap (Conditional on Credentials/Authorization)

### Short-Term (no external approval required)
- Manual browser E2E validation of remaining offline sync scenarios
- Gemma end-to-end evidence capture via watchdog path
- Update remaining-work checklist with current verified status

### Medium-Term (with explicit credentials/approval)
- **Gemina Live realtime session**: Provide `GOOGLE_AI_API_KEY` + Live API access; implement secure realtime bridge with mic consent, lifecycle, interruption handling
- **Official Nano Banana/Lyria**: Obtain official API access/credentials; integrate server-side only; never present fallback as official
- **Firebase/Firestore**: Provide GCP project/emulator-prod credentials; add SDK; implement security rules with consent/data minimization; verify CRUD/sync tests
- **BigQuery**: Provide GCP dataset credentials; add parameterized query validation test; verify schema with `performed:false` contract
- **Cloud Run deployment**: Install Docker; provide GCP project ID, billing authorization, explicit deployment approval; build and deploy

### Long-Term
- Real ERP/CMMS connector (official provider API, sandbox, idempotency/audit, human approval for consequential records)
- Full reliable sync with server-mediated conflict resolution beyond draft notes
- Multi-tab conflict strategy documentation/optional merge
- Rate limiting/authz/CSRF review
- Durable DB migration from localStorage
- Full test suite on capable environment (no constrained `--maxWorkers=1 --no-file-parallelism`)

## Accuracy Constraints (always observed)
- Never claim production deployment
- Never claim official Gemini Live, Firebase, BigQuery, Nano Banana, Lyria, or Agent Skills integration
- Never claim real ERP/CMMS connectivity
- Never say AI determines electrical safety
- State that deterministic safety gate remains authoritative
- Use synthetic or confirmed de-energized equipment only
- Cite test counts accurately and label prior vs current validation
- Do not modify frozen documentation unless explicitly authorized