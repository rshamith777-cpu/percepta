# KriyaOS — Final Demo Script (3–5 minutes, honest)

**Safety:** Synthetic or **confirmed de-energized** equipment only. Never use energized equipment. KriyaOS is **not** production-ready or certified. Deterministic safety gate is authoritative; AI/Gemma/manuals/images/voice/offline/robotics/ERP/analytics **never** certify isolation or safe-to-touch.

**Evidence basis:** This script follows implemented code and recorded evidence (`docs/FINAL_SUBMISSION_EVIDENCE_MATRIX.md`, `docs/INTEGRATION_STATUS.md`, `docs/OFFLINE_AND_SYNC.md`). **Do not invent** screenshots, video links, latency numbers, API outputs, or live integrations.

## Browser/E2E caveat (important)
Phase 4 browser validation was **NOT TESTED** due to resource constraints (C: ~0.52 GB free; app server not started). Any step below that depends on live UI interaction, offline browser toggle, or a running app is **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**.

---

## 1) Introduction & problem (0:00–0:40)
- **What to show:** README or project title/workbench landing (if app running). **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION** for live UI.
- **What to say:** “KriyaOS is a safety-first AI copilot prototype for industrial solar inverter maintenance workflows. Field technicians need guidance, but AI must not guess electrical safety. KriyaOS combines an advisory AI workflow with a deterministic fail-closed safety gate that remains authoritative.”
- **Expected result:** Audience understands the problem and safety posture.
- **What not to claim:** Production readiness, certification, safe use on energized equipment, or fully autonomous repair.

## 2) Maintenance workflow with synthetic data (0:40–1:10)
- **What to show:** Maintenance/workbench flow using **synthetic** maintenance data or a clearly labeled demo record. **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**.
- **What to say:** “We use synthetic or confirmed de-energized demo data only. The workflow captures the issue context, supports diagnosis/manual grounding where available, and tracks maintenance records with auditability.”
- **Expected result:** Shows structured maintenance context without implying real-world deployment.
- **What not to claim:** Real customer data, real ERP-connected records, or manufacturer-certified guidance.

## 3) Deterministic safety gate + BLOCK cannot be overridden (1:10–1:50)
- **What to show:** A case that triggers BLOCK/unsafe escalation (e.g., uncertain/potentially live or missing safety confirmations), using synthetic inputs. **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**.
- **What to say:** “The deterministic safety gate evaluates before and after AI. When conditions are unsafe or uncertain, it returns BLOCK and escalation guidance. AI, manuals, images, voice, or watchdog outputs cannot override BLOCK or certify isolation/safe-to-touch.”
- **Expected result:** BLOCK/escalation is visible; no unsafe repair guidance.
- **What not to claim:** That AI or camera verified de-energization, or that the system is safe for live electrical work.

## 4) Ordinary technician-note draft workflow (1:50–2:25)
- **What to show:** `MaintenanceDraftSyncPanel` / draft notes area on an existing maintenance record: save a local ordinary note draft. **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION**.
- **What to say:** “Technicians can save an ordinary local maintenance-note draft. This is local draft data — it is not a safety decision, does not change verification status, and does not mark repairs resolved.”
- **Expected result:** Draft appears in local queue/state as pending/local.
- **What not to claim:** Full offline application support, automatic sync, or sync of safety/verification fields.

## 5) Explicit offline draft sync and limitations (2:25–3:10)
- **What to show:** Explain explicit “Sync now” behavior; if verified live, demonstrate offline/refresh/conflict carefully. **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION** (all browser offline/refresh/conflict/401 interactions).
- **What to say:** “KriyaOS implements a **local maintenance-note draft queue with explicit sync** — not complete offline application functionality. Sync is user-triggered and updates only ordinary technician notes with idempotency and conflict detection. It never modifies safety gate decisions, isolation/safe-to-touch state, diagnosis block status, maintenance/verification status/history, or `verified_resolved`. Known limitations: browser E2E not executed in Phase 4, multi-tab localStorage last-write-wins, no background auto-sync, conflict UI is basic.”
- **Expected result:** Honest understanding of scope and safety boundaries.
- **What not to claim:** Background sync, full offline app, conflict-free multi-device sync, or browser-validated E2E unless you verified it live immediately before submission.

## 6) Advisory/watchdog architecture (Gemma) — no fake live inference (3:10–3:45)
- **What to show:** Architecture/status references (`/api/safety/watchdog` concept, docs/status panel) if available. **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION** for live UI/API calls.
- **What to say:** “KriyaOS has an existing advisory/watchdog integration path for local runtime/Gemma-style classification (Ollama-compatible, localhost), with BLOCK short-circuit behavior and no automatic model download. In Phase 4 read-only checks, Ollama 0.40.15 was present and the local API responded, but `/api/tags` returned no models (`gemma3:1b` not listed), so there is **no Phase 4 live KriyaOS→Gemma inference evidence**. Gemma is advisory only and never a safety authority.”
- **Expected result:** Clear separation between implemented path and verified live inference.
- **What not to claim:** Gemma inference verified, model loaded, latency numbers, or safety decisions made by Gemma.

## 7) Blocked external integrations — honest status (3:45–4:20)
- **What to show:** `docs/INTEGRATION_STATUS.md` / truthful integration status UI (if running). **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION** for live UI.
- **What to say:** “Official/external integrations that require credentials, official access, or deployment authorization are reported truthfully as blocked, unverified, scaffold-only, or not integrated — including Gemini Live realtime sessions, official Nano Banana/Lyria/Agent Skills, verified Firebase/Firestore operations, verified BigQuery ingestion, live Cloud Run deployment, and real ERP/CMMS. Status/config endpoints returning 503/501 or placeholders are not presented as completed integrations.”
- **Expected result:** Judges see technical honesty and clear evidence boundaries.
- **What not to claim:** Working official integrations without executed verification, or cloud sync/deployment completed.

## 8) Conclusion & roadmap (4:20–5:00)
- **What to show:** Summary slide/text from README or evidence matrix. **DEMO ONLY IF VERIFIED LIVE BEFORE SUBMISSION** for live app.
- **What to say:** “KriyaOS demonstrates a safety-first maintenance copilot prototype: deterministic safety authority, advisory AI foundations, local/synthetic robotics workflow evidence, and a narrowly scoped explicit draft-sync mechanism with contract-tested safety boundaries. Next steps are browser E2E validation on adequate resources, Gemma end-to-end evidence when the model/runtime is available, and credential-gated/external integrations only with verified access and deployment authorization.”
- **Expected result:** Strong, credible close.
- **What not to claim:** Production deployment, complete blueprint fulfillment, or certification.

---

## Pre-demo checklist
- [ ] Confirm machine has enough resources if running the app (Phase 4: C: was ~0.52 GB free — risky).
- [ ] Use synthetic/de-energized data only.
- [ ] Verify any live UI claim immediately before presenting; otherwise use docs and mark as not live-demonstrated.
- [ ] Do not show secrets, API keys, or personal data.
- [ ] Have `docs/FINAL_SUBMISSION_EVIDENCE_MATRIX.md` available for judge questions.
