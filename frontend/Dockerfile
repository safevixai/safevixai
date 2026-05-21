# ── Stage 1: deps ─────────────────────────────────────────────────────────────
# Install production + dev dependencies (needed for next build).
FROM node:26-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# Use --legacy-peer-deps to tolerate minor peer conflicts on free CI runners
RUN npm ci --legacy-peer-deps

# ── Stage 2: builder ─────────────────────────────────────────────────────────
# Compile the Next.js app in standalone output mode.
FROM node:26-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bake in any PUBLIC_ env vars needed at build time (non-secret).
# Override via --build-arg or pass as Docker secrets.
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_CHATBOT_BASE_URL=""

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_CHATBOT_BASE_URL=$NEXT_PUBLIC_CHATBOT_BASE_URL

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
# Minimal production image — only the compiled output, no dev deps.
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone output bundles everything under .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

EXPOSE 3000

# Run the self-contained Next.js server (no next-start binary needed)
CMD ["node", "server.js"]
