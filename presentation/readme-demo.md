## Demo Instructions — KriyaOS

### Prerequisites
- Node v22.22.3, npm 10.9.8
- D: drive with ~241 GB free (C: has ~6 GB minimum)
- Playwright Chromium at D:\ms-playwright
- Ollama 0.40.15 with gemma3:1b model at C:\Users\ddsai\.ollama\models\)

### Starting the Demo Server
1. Ensure standalone build: `D:\KriyaOS-build-check\.next\standalone\` exists (~120.5 MB)
2. Start server: `cd D:\KriyaOS-build-check && set PORT=8080 && set HOST=127.0.0.1 && node .\.\next\standalone\server.js`
3. Verify: `curl http://127.0.0.1:8080/api/health` returns JSON with truthful status

### Running the E2E Demo
1. Set environment: `set PLAYWRIGHT_BROWSERS_PATH=D:\ms-playwright`
2. Run tests: `npx playwright test` — 17 offline maintenance-note workflow scenarios
3. All 17 tests pass against http://127.0.0.1:8080

### Key Demo Points
- System health: `/api/health` — truthful status, all integrations unconfigured/disabled
- Safety BLOCK: Create blocked record; sync does not change block status (Test 14)
- Offline draft: Go offline, create draft, go online, click "Sync now (explicit)" (Test 16)
- Idempotent sync: Duplicate sync prevented via idempotency key (Test 7)
- Conflict detection: Server version differs → conflict UI, `syncState: conflict` (Test 8)
- CMMS export: JSON/CSV with synthetic data labels only

### What Is NOT Live
- Gemini Live realtime session
- Firebase/Firestore CRUD operations
- BigQuery ingestion
- Official Nano Banana/Lyria/Agent Skills integrations
- Real ERP/CMMS connectivity
- Cloud Run deployment (artifacts verified but not deployed)

All synthetic equipment. No AI determines electrical safety. Deterministic safety gate remains authoritative at all times.