# Container image for a self-hosted HUD.
#
# The Vercel deployment needs none of this; it exists so a deployment that owns its own
# ClickHouse (an out-of-tree accelerator publishing benchmark results, say) can run the same app
# without forking it. Point it at a database with CLICKHOUSE_BENCHMARK_DATABASE.
#
# Build from the torchci/ directory:
#   docker build -t torchci:local torchci/
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Selects `output: "standalone"` in next.config.js.
ENV NEXT_OUTPUT_STANDALONE=1
RUN npx next build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# queryClickhouseSaved reads these from disk at request time, and `standalone` does not trace
# them as imports, so they have to be copied explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/clickhouse_queries ./clickhouse_queries
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
