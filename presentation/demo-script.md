# KriyaOS — 5–7 Minute Live Demo Script

## Opening (0:00–0:30)
**Narration**: "Welcome to KriyaOS — a solar inverter maintenance platform built with safety as the absolute priority. I'm going to demonstrate the core workflow: from entering maintenance notes, through offline handling, to explicit synchronization — all while ensuring the deterministic safety gate remains authoritative."

## System Health (0:30–1:00)
**Action**: Navigate to `http://127.0.0.1:8080`
**Narration**: "First, system health. Notice the `/api/health` endpoint returns truthful status — all integrations are clearly marked. Gemini diagnosis: unconfigured. Gemini Live: unconfigured. CMMS: disabled, no credentials. The deterministic safety gate is marked `available_authoritative`. No green 'connected' status from config alone — this is intentional."

**Point of emphasis**: "Every integration status is truthful. A configured key/URL does not mean verified external connectivity."

## Synthetic Maintenance Scenario (1:00–2:00)
**Action**: Enter a synthetic maintenance problem — e.g., "Inverter displaying error code E07, possible overheating"
**Action**: The system passes this to the advisory endpoint (Gemina/Local Ollama) but the response is explicitly labeled advisory-only.
**Narration**: "Here's a synthetic maintenance problem. The system may consult an advisory model, but I want to emphasize: the AI output is advisory only. It cannot certify this equipment as safe to touch. The deterministic safety gate evaluates the problem description independently."

## Safety BLOCK Demonstration (2:00–3:00)
**Action**: Create a record with `diagnosisBlocked: true` — e.g., "Potentially live electrical component exposed"
**Action**: Verify the record appears blocked in the UI
**Action**: Attempt to sync notes — the sync should not change the block status
**Narration**: "Now I'll demonstrate a safety BLOCK. This record is marked as blocked — potentially live electrical component. Notice the block status. Now I'll attempt to sync a note — and you'll see the block persists. The deterministic safety gate is fail-closed and cannot be bypassed by UI actions, AI suggestions, or offline sync. This is verified by our test suite: 14/17 E2E test validates that BLOCK cannot be bypassed."

**Point of emphasis**: "AI cannot override the block. UI cannot override the block. Only a deliberate, authorized gate reset would change this status."

## Offline Draft and Explicit Sync (3:00–4:30)
**Action**: Go offline (toggle in browser)
**Action**: Create an offline draft note — e.g., "Observed unusual noise from inverter fan"
**Action**: Go back online
**Action**: Click "Sync now (explicit)" — note syncs as ordinary technician notes
**Narration**: "Offline functionality: I'll go offline now, create a draft note locally. The draft persists in localStorage — it's offline-first. Now I'm back online. I explicitly click 'Sync now (explicit)' — the draft syncs as regular maintenance notes. Notice: no background sync. No implicit sync on reconnect. The sync is entirely user-triggered. This is verified: 16/17 E2E test confirms 'No background or implicit sync (reconnect does not auto-sync)."

**Point of emphasis**: "Sync is explicit. Reconnection does not auto-sync. Idempotency key prevents duplicate application."

## CMMS Demo and Export (4:30–5:00)
**Action**: Navigate to CMMS section
**Action**: Show synthetic CMMS data with export options (JSON/CSV)
**Narration**: "CMMS demo: The computerized maintenance management system is a local simulator — synthetic data only, no real connector, no external operations. Export formats are JSON and CSV with data labels (sessionId, eventType, dataLabel). All clearly marked as demo/synthetic."

**Point of emphasis**: "No live ERP/CMMS operations occur. No real work orders are sent. This is synthetic/demo only."

## Limitations and Closing (5:00–5:30)
**Narration**: "To summarize what's not live: Gemini Live realtime session, official Nano Banana/Lyria/Agent Skills integrations, Firebase/Firestore operations, BigQuery ingestion, real ERP/CMMS connectivity, Cloud Run deployment. The deterministic safety gate remains authoritative throughout. All synthetic equipment. No AI determines electrical safety."

**Final point**: "KriyaOS is a safety-first platform with truthful integration status, offline-capable maintenance notes with explicit sync, and a deterministic fail-closed safety gate. All external integrations are explicitly unconfigured or blocked — never implied live."

**Thank you.**