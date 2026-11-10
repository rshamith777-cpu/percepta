# Deployment (Cloud Run readiness)

## Local build (verified constrained)
```bat
cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run build"
```
Produces Next.js output including `.next/standalone` (configured via `next.config.ts` `output: "standalone"`).

## Health/readiness
- `GET /api/health` returns truthful JSON status (app, integrations config hints, features). Use for basic liveness/readiness checks; do not treat it as proof of external provider connectivity.

## Container (artifacts present; **not built/run here**)
- `Dockerfile` and `.dockerignore` exist. Docker was **not installed** in this environment, so container build/run was **not verified**.
- Build/run (requires Docker):
  ```bash
  docker build -t kriyaos .
  docker run --rm -p 8080:8080 -e PORT=8080 -e GOOGLE_AI_API_KEY=... kriyaos
  curl http://localhost:8080/api/health
  ```

## Cloud Run (**not deployed**)
- **No gcloud deploy performed; no billable resources created; no URL invented.**
- With explicit authorization + GCP project/auth:
  1. Build/push image (Artifact Registry) or use supported source deploy.
  2. Set env vars/secrets via Secret Manager (never in image/source/client): `GOOGLE_AI_API_KEY`, optional `GEMINI_MODEL`, `WATCHDOG_*` only if using a reachable local-equivalent is not applicable (cloud runtime is not local Ollama), `AUTH_*` if needed.
  3. Deploy: `gcloud run deploy kriyaos --image <image> --region <region> --allow-unauthenticated` (only if public access is intended) `--set-secrets ...`
  4. Verify: `GET <service-url>/api/health`, smoke test key pages/APIs, confirm safety behavior unchanged.

## Security notes
- Never bake secrets into Docker images or commit `.env.local`.
- Keep Gemini keys server-side only (no `NEXT_PUBLIC_GOOGLE_AI_API_KEY`).
- Prefer non-root runtime and least-privilege service account where feasible.
