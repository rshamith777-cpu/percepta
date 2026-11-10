# KriyaOS — FINAL SETUP GUIDE

## Run locally (verified path)

```bash
cd C:\Users\ddsai\Downloads\KriyaOS
npm install
cp .env.example .env.local   # on Windows PowerShell: Copy-Item .env.example .env.local
# Edit .env.local only locally. Never commit secrets.
npm run dev
# or production:
npm run build
npm run start
```

Open the URL printed by Next.js (dev default `http://localhost:3000`; production port may vary if configured).

## Quality checks (memory-aware, run one at a time)
```bash
npx tsc --noEmit
set NODE_OPTIONS=--max-old-space-size=3072 && npm run lint   # PowerShell: $env:NODE_OPTIONS='--max-old-space-size=3072'; npm run lint
npm test
set NODE_OPTIONS=--max-old-space-size=4096 && npm run build
```

## Key endpoints
- Health: `GET /api/health`
- Integration status (truthful): `GET /api/integrations/status`
- Robotics prototype (synthetic/local): `GET/POST /api/robotics`, `GET /api/robotics/export?format=json|csv`
- Offline fallback page: `/offline` (service worker registers in production only)

## Manual steps you must complete (as needed)
1. **Gemini diagnosis (real responses):** set `GOOGLE_AI_API_KEY` in `.env.local` (server-side only). Expect quota/model/network limits; 429 fallback is handled without fabricated diagnosis.
2. **OCR for scanned PDFs (optional):** install Tesseract + language data; set `OCR_ENABLED=true`, `OCR_PROVIDER=tesseract-local`, and paths as needed in `.env.example`.
3. **Firebase/Firestore:** create Firebase project, obtain server credentials, configure env vars, implement/enable only verified server-side code paths, set secure rules, test with emulator first. **Not integrated/verified in current repo without credentials.**
4. **BigQuery:** GCP project/dataset/service account or ADC; explicit consent/data-minimization pipeline required. **Not integrated/verified.**
5. **Cloud Run (actual deploy):** Docker is not installed in the audit environment and no GCP deploy was run. Artifacts exist (`Dockerfile`, `.dockerignore`, `next.config.ts` `output:'standalone'`), and `npm run build` produced standalone output. You must:
   ```bash
   docker build -t kriyaos .
   docker run -p 8080:8080 -e PORT=8080 kriyaos
   # then deploy with gcloud/authenticated project, set secrets in Secret Manager/env
   ```
   Do **not** claim deployment succeeded without a verified Cloud Run URL/health check.
6. **Gemini Live / official Nano Banana / official Lyria / Google Agent Skills / real ERP:** require official API/product access, credentials, and supported SDKs. Current code must not simulate them. Configure only when access is confirmed; verify with real calls.
7. **Gemma local inference:** manual local runtime/model install only (not auto-downloaded). Measure model size/RAM/latency; keep advisory and non-safety-authoritative.
8. **Browser offline smoke:** run production build/start, open app, use DevTools network offline/online toggle; verify `/offline` fallback behavior and that app does **not** present stale diagnosis/safety as current. SW registers only in production.

## Safety reminder
Synthetic or confirmed de-energized equipment demos only. Deterministic safety gate is authoritative. No live/energized repair, no isolation certification, no AI override of BLOCK decisions.
