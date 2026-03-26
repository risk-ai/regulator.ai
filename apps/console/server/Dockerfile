# Vienna Console Server - Production Dockerfile
# Multi-stage build for optimal size and security

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy workspace packages
COPY services/vienna-lib ./services/vienna-lib
COPY apps/console/server ./apps/console/server

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Build vienna-lib
WORKDIR /app/services/vienna-lib
RUN npm run build || echo "No build script for vienna-lib"

# Build console server
WORKDIR /app/apps/console/server
RUN npm run build:prod || npm run build

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
COPY turbo.json ./
COPY services/vienna-lib/package.json ./services/vienna-lib/
COPY apps/console/server/package.json ./apps/console/server/

RUN npm ci --production --workspace=services/vienna-lib --workspace=apps/console/server

# Copy built artifacts from builder
COPY --from=builder /app/services/vienna-lib ./services/vienna-lib
COPY --from=builder /app/apps/console/server/dist ./apps/console/server/dist
COPY --from=builder /app/apps/console/server/build ./apps/console/server/build

# Copy any runtime dependencies
COPY apps/console/server/.env.example ./apps/console/server/.env.example

# Create runtime directories
RUN mkdir -p /app/data/state && \
    mkdir -p /app/data/uploads && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Set working directory to server
WORKDIR /app/apps/console/server

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
