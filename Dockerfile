# Vienna OS — Production Docker Image
# Builds backend API server (console-proxy)

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only
FROM base AS deps
COPY apps/console-proxy/package*.json ./
RUN npm ci --production

# Build stage (if needed for future compilation)
FROM base AS build
COPY apps/console-proxy/package*.json ./
RUN npm ci
COPY apps/console-proxy ./
# RUN npm run build (if we add a build step later)

# Production runtime
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/console-proxy ./

# Expose API port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "api/server.js"]
