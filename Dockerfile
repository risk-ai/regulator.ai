# Vienna OS — Production Docker Image
# Builds backend API server (console-proxy)
# Security hardened: non-root user, read-only filesystem, minimal capabilities

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only (production)
FROM base AS deps
COPY apps/console-proxy/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Production runtime
FROM node:20-alpine AS runtime

# Security: create non-root user
RUN addgroup --system --gid 1001 vienna && \
    adduser --system --uid 1001 --ingroup vienna --no-create-home vienna

WORKDIR /app

ENV NODE_ENV=production
# Bind to all interfaces (nginx/Caddy reverse proxy controls external access)
ENV PORT=3100

# Copy only production dependencies and app code
COPY --from=deps --chown=vienna:vienna /app/node_modules ./node_modules
COPY --chown=vienna:vienna apps/console-proxy ./

# Security: run as non-root
USER vienna

# Expose API port (bind externally via -p 127.0.0.1:3100:3100 in docker run)
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
# Use --max-old-space-size to limit memory consumption
CMD ["node", "--max-old-space-size=512", "api/server.js"]
