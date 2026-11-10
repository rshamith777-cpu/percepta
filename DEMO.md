# KriyaOS — Demo Guide (Safe, Honest)

**Scope:** Synthetic or **confirmed de-energized** solar inverter demo equipment only. This is a prototype, not certified for real electrical maintenance. Do **not** use live/energized equipment, do **not** perform electrical work, and do **not** treat AI/camera/image outputs as verified safety or isolation evidence.

**Submission evidence:** See `docs/FINAL_SUBMISSION_EVIDENCE_MATRIX.md` and `docs/FINAL_DEMO_SCRIPT.md`. Phase 4 browser E2E validation was **NOT TESTED** (resource constraints; app not started). Mark any live UI step **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**.

## What works without external AI quota (prototype scope)
- **Deterministic safety gate (authoritative):** blocks unsafe/uncertain/live inputs and unsafe AI output patterns; shows safe escalation. Works without Gemini.
- **Manual library:** upload/list/select manuals (server-side PDF extraction). Relevance filtering prevents unrelated documents from being used for grounding. Grounding is fail-closed.
- **Maintenance records/export, audit history:** local JSON persistence (when server is running).
- **CMMS/ERP foundation:** **demo adapter only** (synthetic data), clearly labeled; **no real ERP connection**.
- **Voice:** browser speech recognition/synthesis when supported (advisory).
- **Annotations/2D camera overlay:** advisory; **not** spatial AR tracking, not measurements, not safety verification.
- **Offline draft sync (limited):** **local maintenance-note draft queue with explicit user-triggered sync** — ordinary technician notes only, idempotent/conflict-detecting; **never** modifies safety gate decisions, isolation/safe-to-touch status, maintenance/verification status/history, or `verified_resolved`. **Not** full offline application functionality, **no** background auto-sync. **Browser E2E NOT TESTED (Phase 4).**

## What requires external dependencies / is not verified
- **Gemini diagnosis text:** requires `GOOGLE_AI_API_KEY` (server-side) and available quota/model access. May return 429/unavailable; KriyaOS degrades gracefully (no fabricated diagnosis). **Live success not verified in Phase 4/5 closeout.**
- **Gemma/local watchdog inference:** advisory integration path exists (Ollama-compatible localhost). **Phase 4 read-only:** Ollama 0.40.15 present, API responded, but `/api/tags` returned `{"models":[]}` (`gemma3:1b` not listed); **no live KriyaOS→Gemma inference evidence**.
- **Gemini Live, official Nano Banana, official Lyria, official Google Agent Skills, Firebase/Firestore verified ops, BigQuery verified ingest, Cloud Run live deploy, real ERP/CMMS:** **not integrated/verified** as working external integrations (blocked/scaffold/truthful status only where applicable).
- **Scanned PDF OCR:** requires Tesseract or configured HTTP OCR service.
- **Camera:** browser permission/device required; cannot verify de-energized/safe-to-touch status.
- **No real AR tracking, no real robot control, no real hardware integration claims.**

## Starting the app (resource caution)
Phase 4/5 environment had **C: ~0.52 GB free** — starting `next dev`/build may be unsafe on that machine. Only run if resources are adequate.

```powershell
npm install
# Optional: set server-side GOOGLE_AI_API_KEY in .env.local for Gemini attempts
$env:NODE_OPTIONS="--max-old-space-size=3072"
npm run build
npm run start
```

Open: `http://localhost:3000` (or port shown). Health: `http://localhost:3000/api/health`. **Do not claim build/start success unless executed and observed.**

## Demo workflow (recommended, honest)
1. **Open UI & set expectations** — **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**. Confirm synthetic/de-energized scope; camera/AI cannot verify isolation; check truthful Application & AI service status.
2. **Safety BLOCK (no Gemini needed)** — **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**. Show deterministic BLOCK/escalation; AI cannot override BLOCK.
3. **Synthetic/de-energized workflow** — **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**. If Gemini unavailable (429), show graceful fallback (no fabricated diagnosis, independent safety/manual context).
4. **Manual relevance/grounding** — **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**. Use legitimate or clearly labeled synthetic fixtures; no manufacturer validation claims.
5. **Offline draft note (limited)** — **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**. Show local maintenance-note draft + explicit sync only if verified live; emphasize: ordinary notes only, no safety/verification state changes, no background sync, browser E2E not executed in Phase 4.
6. **Gemma/advisory status** — **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**. Describe advisory/watchdog path only; **no live inference evidence** (model not listed in Phase 4).
7. **Limitations** — blocked external integrations, browser validation not executed, not production-ready/certified.

## Verification commands (maintainer; run only when resources permit)
```powershell
npx tsc --noEmit
npm run lint
npm test
$env:NODE_OPTIONS="--max-old-space-size=3072"; npm run build
```

**Latest executed (Phase 3 targeted, bash env):** `tsc --noEmit` PASS; targeted ESLint PASS (0 errors/warnings, Phase 3 scope); 3 targeted vitest files **14 passed** (8 queue + 5 integration contracts + 1 draft-sync safety). Full `npm test`/lint/build **not freshly executed** in Phase 4/5.

## Safe shutdown
- Stop server with `Ctrl+C` in the terminal running it.
- No background services required by default.

## Safety reminders
- Synthetic or confirmed de-energized equipment only.
- Deterministic safety gate authoritative; BLOCK cannot be overridden.
- AI/camera/image/watchdog cannot verify electrical isolation or safe-to-touch.
- Blocked repairs must never become `verified_resolved`.
- Not production-ready, not certified.
