# Cloud Run-ready Dockerfile for KriyaOS (Next.js standalone)
# NOTE: Docker is not installed in the audit environment, so this image was not built here.
# Verify locally: docker build -t kriyaos . && docker run -p 8080:8080 -e PORT=8080 kriyaos
# Cloud Run sets PORT; configure secrets via Secret Manager / env vars, never bake them in.

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build with constrained memory; adjust for CI.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
ENV PORT=8080
# Next standalone server.js respects PORT/HOSTNAME.
CMD ["node", "server.js"]
