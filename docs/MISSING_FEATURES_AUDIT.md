# KriyaOS — Missing Features Audit

**Audit Date:** 2026-11-08  
**Scope:** `D:\KriyaOS-build-check` — all source code, tests, and configuration  
**Safety:** Deterministic safety gate is authoritative. No AI, Gemini, Gemma, or camera output can certify electrical isolation, safe-to-touch status, or override BLOCK decisions. All work is synthetic/confirmed de-energized demo only.

## Overview

This audit identifies features that are incomplete, broken, placeholder-only, or dependent on external credentials/infrastructure that is not available in this environment. For each feature, the current implementation, root cause, and feasibility of local implementation are documented.

The audit does not trust status labels without examining source code. Every claim is verified against actual code.

---

## 1. Watchdog Status and Availability

### Current UI Display
- `Availability: error (unknown)`
- `Could not load watchdog status.`

### Root Cause
The watchdog module (`src/modules/safety/watchdog/`) relies on `WATCHDOG_MODE`, `WATCHDOG_URL`, and `WATCHDOG_MODEL` environment variables. When these are not properly configured, the status falls back to `disabled`/`not_configured` with the message `Could not load watchdog status.`

The watchdog code at `src/modules/safety/watchdog/localRuntime.ts` correctly handles the cases where:
- `WATCHDOG_MODE` is `off` → returns `disabled`
- `WATCHDOG_URL` is not configured → returns `not_configured`
- Fetch fails/timeout → returns appropriate error state

However, the UI integration and status display may not be correctly reading or displaying the watchdog advisory status from the module's public API (`getWatchdogStatus`, `runLocalRuntimeWatchdog`).

### Can Be Implemented Locally
✅ Yes. The watchdog module is fully implemented and tested (7/7 vitest tests pass). The issue is UI integration — ensuring the status endpoint is correctly called and displayed.

### External Dependencies
- Ollama at `127.0.0.1:11434` (model `gemma3:1b` is available and verified)
- `WATCHDOG_MODE`, `WATCHDOG_URL`, `WATCHDOG_MODEL` environment variables

### Proposed Implementation
1. Ensure the API route `/api/watchdog/status` correctly calls `getWatchdogStatus()` and returns structured JSON
2. Update the UI component to display watchdog availability with proper labeling:
   - `available` when `WATCHDOG_MODE=local-runtime` and `WATCHDOG_URL` is configured
   - `not_configured` when mode is local-runtime but URL missing
   - `disabled` when mode is off
   - `error`/`timeout` on network failures
3. Add useful error messages that help the user understand the state
4. Never automatically download a model; never assume the model is installed
5. Support advisory checks when a compatible runtime is available (Ollama `gemma3:1b` at `127.0.0.1:11434/api/generate`)
6. Never allow watchdog output to override safety decisions (BLOCK precedence preserved)

### Verification Method
- Run: `npx vitest run src/modules/safety/watchdog/` → 7/7 passed
- Call: `curl http://127.0.0.1:8080/api/watchdog/status` → returns structured JSON
- Verify BLOCK precedence: safety gate BLOCK cannot be overridden by watchdog output

### Status: **Partially Implemented** — Module logic complete; UI integration needs verification

---

## 2. Lyria Status and Audio Hook

### Current UI Display
- `Could not load Lyria status.`

### Root Cause
The Lyria integration is listed in the integration status as **not implemented** (custom hook/browser speech fallback exists but is not official Lyria). The status endpoint correctly reports this, but the UI may show a generic error message.

The integration is documented in `docs/INTEGRATION_STATUS.md` as:
> **Not implemented** as official Lyria. Optional configurable ambient hook/browser speech fallback exists (not Lyria). No official Lyria test.

### Can Be Implemented Locally
✅ Partially. The truthful status display can be improved, and the custom hook can be made functional as a browser speech fallback (not Lyria).

### External Dependencies
- Official Lyria API access (not available without credentials/eligibility)
- Google Cloud TTS (not configured)

### Proposed Implementation
1. Update the status endpoint to truthfully report Lyria status: `not implemented / hook only`
2. Improve the UI to clearly distinguish:
   - "Official Lyria integration: not available (requires credentials)"
   - "Custom browser speech fallback: available (advisory only, not Lyria)"
3. Implement the ambient audio hook as a user-requested browser speech feature (not automatic, not safety-related, not presented as Lyria)
4. Ensure no audio is generated automatically; user explicitly requests it
5. Clearly label: "Not official Lyria. Custom browser speech fallback only."

### Verification Method
- Call: `curl http://127.0.0.1:8080/api/integrations/status` → reports Lyria as `not implemented / hook only`
- Verify UI shows: "Official Lyria integration: not available (requires credentials)" + "Custom browser speech fallback: available (advisory only)"
- No audio generated without explicit user request

### Status: **Scaffold Only** — Truthful status display; no official Lyria integration

---

## 3. Gemini Diagnosis

### Current State
The Gemini diagnosis module (`src/modules/ai/geminiDiagnosis.ts`) is fully implemented server-side with:
- Schema validation (`diagnosisResultSchema`)
- Image limitation/safety labeling requirements (required)
- Upstream error classification and sanitization
- Transient retry logic
- Token/quota/auth error handling
- Model availability checking
- JSON parsing and validation

However, the diagnosis requires `GOOGLE_AI_API_KEY` which is not configured in this environment. The API returns appropriate errors when the key is missing.

### Missing Behavior (Local Implementation)
Several local behaviors can and should be implemented:

1. **Diagnosis without API key** — Graceful error when `GOOGLE_AI_API_KEY` is not configured, never falling back to fake success
2. **Image limitation labeling** — The schema already requires `imageLimitationsNotice`; the UI should display this prominently
3. **Demo mode without API key** — When no API key, show informed consent UI stating diagnosis is unavailable, not groundable in manuals, and advisory-only
4. **Safety gate before/after AI** — Already implemented in `evaluateSafetyGate()` — pre-gate checks BLOCK first, post-gate AI output scanning never overrides BLOCK
5. **Manual retrieval** — When eligible documents exist, can run; when no manuals, disclosure is shown
6. **Failure states** — Honest errors, never fabricated diagnosis

### Can Be Implemented Locally
✅ Yes. All the above behaviors are implementable without the Gemini API key. The code is architected for this.

### External Dependencies
- `GOOGLE_AI_API_KEY` (not configured in this environment)
- Google GenAI API (not accessible without key)

### Proposed Implementation
1. Add API route `/api/diagnose` that:
   - Checks for `GOOGLE_AI_API_KEY`; if missing, returns honest error: "Gemini diagnosis not configured. Set GOOGLE_AI_API_KEY to enable."
   - If key present, attempts diagnosis with proper timeout, schema validation, and image limitation labeling
   - On any error, returns structured error (never fabricated diagnosis)
   - Demo mode: shows informed consent UI explaining diagnosis is unavailable, not certified, advisory-only
2. Update UI diagnosis form:
   - Shows "Diagnosis not configured — set GOOGLE_AI_API_KEY to enable"
   - When key present, enables diagnosis workflow
   - Always displays: "AI output is advisory only. Cannot certify electrical safe-to-touch."
3. Ensure safety gate runs before and after AI — BLOCK cannot be overridden
4. never fabricate diagnosis responses; alwayshonest errors

### Verification Method
- Call: `curl http://127.0.0.1:8080/api/diagnose` → "Gemini diagnosis not configured. Set GOOGLE_AI_API_KEY to enable."
- Verify: safety gate BLOCK precedence preserved (pre-gate and post-gate)
- Verify: image limitation labeling always present when AI runs
- Verify: no diagnosis claimed when key missing

### Status: **Scaffold Impleme
