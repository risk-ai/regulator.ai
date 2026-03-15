# Vienna Runtime Service - Production Dockerfile

FROM node:22-alpine AS builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --include=optional

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --include=optional

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Create data directory for local dev (overridden by volume in production)
RUN mkdir -p /app/data/artifacts

# Expose port (Fly.io will set $PORT at runtime)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application (Fly.io handles init)
CMD ["node", "dist/index.js"]
