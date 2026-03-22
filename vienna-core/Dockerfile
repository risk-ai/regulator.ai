# Vienna OS Production Dockerfile
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY console/server/package*.json ./console/server/
COPY console/client/package*.json ./console/client/

# Install all dependencies (including dev for building)
RUN npm ci
RUN cd console/server && npm ci
RUN cd console/client && npm ci

# Copy application code
COPY . .

# Build frontend
WORKDIR /app/console/client
RUN npm run build

# Build backend
WORKDIR /app/console/server
RUN npm run build

# Production stage
FROM node:22-alpine

# Install runtime dependencies only
RUN apk add --no-cache \
    sqlite \
    curl \
    dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY console/server/package*.json ./console/server/

# Install production dependencies only
RUN npm ci --only=production
RUN cd console/server && npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/console/server/dist ./console/server/dist
COPY --from=builder /app/console/client/dist ./console/dist
COPY --from=builder /app/lib ./lib

# Create runtime directories
RUN mkdir -p /app/runtime/prod/state && \
    mkdir -p /app/runtime/prod/queue && \
    mkdir -p /app/runtime/prod/dlq && \
    mkdir -p /app/runtime/prod/replay && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start server
CMD ["node", "console/server/dist/server.js"]
