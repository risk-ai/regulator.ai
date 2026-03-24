# syntax = docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Copy and install vienna-lib dependencies first
COPY services/vienna-lib/package*.json ./services/vienna-lib/
COPY services/vienna-lib ./services/vienna-lib/
RUN cd services/vienna-lib && npm install --omit=dev --ignore-scripts

# Copy and install server dependencies
COPY apps/console/server/package*.json ./apps/console/server/
# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++
RUN cd apps/console/server && npm install

# Copy server source + config
COPY apps/console/server/src ./apps/console/server/src
COPY apps/console/server/tsconfig*.json ./apps/console/server/
COPY apps/console/server/esbuild.config.mjs ./apps/console/server/

# Build bundled artifact
RUN cd apps/console/server && npm run build:prod

# Production stage
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy package.json for proper module resolution
COPY apps/console/server/package*.json ./

# Install production dependencies (including native modules for Alpine)
RUN npm install --omit=dev --ignore-scripts=false

# Copy bundled server from builder
COPY --from=builder /app/apps/console/server/build ./build

# Copy SQL schema files (needed at runtime)
COPY --from=builder /app/services/vienna-lib/state/schema.sql ./build/

# Remove build tools to reduce image size
RUN apk del python3 make g++

# Expose port
EXPOSE 3100

# Start bundled server (CommonJS)
CMD ["node", "build/server.cjs"]
