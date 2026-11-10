# Security & Safety (Final Closeout)

## Safety (authoritative)
- **Deterministic safety gate is authoritative.** AI/Gemini/Gemma/Lyria/voice/images/manuals/robotics/ERP/cloud/offline cannot override it.
- **Fail closed** for unknown/potentially energized conditions. No AI certification of isolation or safe-to-touch. No bypass of lockout/tagout/technician verification.
- **BLOCK remains BLOCK** regardless of model output. Gemini Live/status/watchdog are advisory or status-only; watchdog BLOCK precedence short-circuits runtime calls.
- Blocked/dangerous cases cannot become `verified_resolved`. Maintenance lifecycle/verification is technician-evidenced and audited.
- Robotics: synthetic/consented demo data only locally; no real robot commands; no external upload without explicit consent/integration.
- Demo scenarios: synthetic or equipment confirmed de-energized by a qualified technician only.

## Security audit summary (targeted)
| Area | Finding / status |
|---|---|
| Secret leakage | No `NEXT_PUBLIC_GOOGLE_AI_API_KEY` usage found in `src/`. `.gitignore` covers `.env`, `.env*.local`, `dev.db`, `data/`. `.env.example` contains placeholders only. **Do not print `.env.local` secrets.** |
| Server-side keys | Gemini key accessed server-side (`GOOGLE_AI_API_KEY`). Health/integration status report config presence, not secret values. |
| Auth | `AUTH_MODE=local` disabled by default. Middleware performs lightweight cookie presence check for protected mutations; route handlers perform full verification via `src/lib/auth.ts` (inspect for HMAC/expiry when enabling). |
| Input validation | Zod schemas used across APIs (diagnosis/manuals/robotics/maintenance/integrations). Continue validating all external/API inputs. |
| Offline/SW | Service worker **never caches `/api/*`**; navigation fallback to `/offline`. Prevents stale cached safety/diagnosis responses. |
| Unsafe logging | Status endpoints avoid exposing secrets; avoid logging keys/tokens/service-account contents. |
| CORS/rate limiting/SSRF/path traversal/XSS/file upload/PDF abuse | Not fully penetration-tested in this closeout. Existing PDF/manual handling and upload paths should be reviewed before production exposure. Add rate limiting/auth for public deployments. |
| Dependency vulnerabilities | `npm audit` not run in this constrained pass; run before production deployment. |
| Offline draft queue | Client-localStorage drafts only; no automatic sync; never mutates safety/verification state. User-controlled handling required. |

## Recommendations before production
- Enable strong auth/session controls, CSRF protections as appropriate, rate limiting, strict CORS, secure headers.
- Store secrets in a secret manager (Cloud Run secrets), never in images/client bundles.
- Review Firestore/BigQuery rules/permissions for least privilege if enabled.
- Run dependency audit and patching; conduct targeted security testing for uploads/PDF parsing/APIs.
- Keep all safety regression tests green.
