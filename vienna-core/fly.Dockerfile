# Vienna OS Backend-Only Dockerfile for Fly.io
FROM node:22-alpine

# Install runtime dependencies
RUN apk add --no-cache sqlite curl python3 make g++

WORKDIR /app

# Copy ROOT package.json and remove postinstall hook
COPY package*.json ./
RUN npm pkg delete scripts.postinstall

# Install root dependencies (for /lib modules)
RUN npm ci --omit=dev

# Copy backend package files
COPY console/server/package*.json ./console/server/

# Install backend dependencies
WORKDIR /app/console/server
RUN npm ci --omit=dev

# Copy backend source
WORKDIR /app
COPY console/server/src ./console/server/src

# Copy lib at APP level (not root)
COPY lib ./lib

# Copy index.js entry point
COPY index.js ./index.js

# Environment
ENV NODE_ENV=production
ENV PORT=3100
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1

EXPOSE 3100

# Run TypeScript directly with tsx (no build step)
WORKDIR /app/console/server
CMD ["npx", "tsx", "src/server.ts"]
