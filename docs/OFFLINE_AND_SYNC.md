# Offline & Sync (Safety-Preserving)

## Implemented (Phase 3 validated scope)

- **Service worker** (`public/sw.js`, `kriyaos-sw-v1`): **never caches `/api/*`**. Network-first navigation with fallback to `/offline`. Runtime cache for `/_next/static/*` only; versioned cache cleanup. Registered only in production.
- **Manifest** (`public/manifest.json`), offline page (`/offline`), connectivity banner.
- **Client draft queue** (`src/lib/offline/maintenanceDraftQueue.ts`, localStorage `kriyaos.maintenanceDraftQueue.v1`): ordinary maintenance **technician-note drafts** with `idempotencyKey`, `recordId`/`baseRecordUpdatedAt`, and states `pending`/`sync_failed`/`conflict`/`synced`. Persists across refresh/restart in browser storage (best effort). **No network side effects in module. No safety/verification state stored or mutated.**
  - Queue reliability (Phase 3): corrupted storage detected and not overwritten automatically on save; storage write/quota errors surfaced; capacity trimming prefers unsynced drafts; enqueue rejects when full of unsynced drafts. Cross-tab localStorage last-write-wins races remain possible (explicit removals are authoritative for the saving tab).
- **Explicit sync endpoint** (`POST /api/maintenance/[id]/draft-notes/sync`): **user-triggered only** (called by UI button). Strict schema. Updates **only `technicianNotes`** on an existing record; appends `notes_updated` audit with `source: offline_draft_sync` and `draftSyncIdempotencyKey`. **Idempotent** (duplicate key returns `alreadyApplied`). **Conflict detection** when `baseRecordUpdatedAt` differs from server `updatedAt` (409, safe preview). **Never modifies** safety gate decisions, isolation/safe-to-touch status, diagnosis BLOCK state, maintenance status, `currentVerification`/`verificationHistory`, `verified_resolved`, escalation, or authorization.
- **UI** (`MaintenanceDraftSyncPanel`): save local draft, online/offline indicator, queue summary, explicit “Sync now”, conflict actions (keep local + update base after review, keep server/remove local, edit locally), auth/network error messages preserving local text. No secrets displayed.

## Safety boundaries (non-negotiable)

- Offline mode must **not** imply safety requirements are satisfied. Deterministic safety gate remains authoritative when online evaluation occurs; service worker does **not** cache `/api/*`.
- Drafts/sync **never** store/mutate safety decisions, **never** mark `verified_resolved`, **never** bypass server safety/verification guards, and **do not auto-sync**.
- Sync is limited to ordinary non-safety technician notes on existing maintenance records.

## Tests executed (Phase 3, targeted; all passed)

| Test | Result |
|---|---|
| `src/lib/offline/maintenanceDraftQueue.test.ts` | **8 passed** (enqueue/dedupe/states, corruption refusal, quota/write failure, queue-full protection, matching-draft-only updates, capacity prefers unsynced) |
| `src/app/api/integrations/integration-contracts.test.ts` | **5 passed** (blocked integrations, no external calls, BigQuery validates but `performed:false`/no ingest) |
| `src/app/api/maintenance/draft-sync-safety.contract.test.ts` | **1 passed** (notes-only update; preserves blocked/safety/verification state; idempotent; conflict 409) |

Run with: `NODE_OPTIONS=--max-old-space-size=2048 npx vitest run <files> --maxWorkers=1 --no-file-parallelism --reporter=verbose` (Git Bash/bash syntax). Earlier `cmd /c` invocation produced no vitest output and appeared hung; bash env syntax succeeded.

## Not fully implemented / unverified (Phase 4 evidence)

- **Browser validation (STEP 2): NOT TESTED.** Reason: resource-constrained environment (C: ~0.52 GB free, 8 GB RAM class machine; no existing server on :3000/:3001; no Playwright/E2E tooling found). Starting `next dev`/build risks disk/cache and memory pressure; full browser E2E (offline toggle, refresh, explicit sync click, server-state/audit inspection, concurrent-edit conflict, 401 auth) was not executed to avoid unsafe resource use and fabricated results. Targeted contract/unit tests passed (see above), but **browser E2E remains unverified**.
- **Multi-tab:** storage events refresh UI; localStorage last-write-wins races can still lose concurrent edits. No CRDT/merge editor.
- Full reliable background sync, automatic reconnect sync, rich conflict merge UI, duplicate prevention across all server operations beyond notes sync key, and offline startup/PWA install E2E tests.
- Sync is **only** for ordinary technician notes (replace mode via UI) — not full maintenance record sync.
