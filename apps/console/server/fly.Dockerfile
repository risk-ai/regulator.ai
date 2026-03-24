# syntax = docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (workspace-aware)
FROM base AS deps
COPY services/vienna-lib /app/services/vienna-lib
COPY apps/console/server/package.json ./package.json
WORKDIR /app
# Fix vienna-lib path reference before install
RUN sed -i 's|file:../../../services/vienna-lib|file:./services/vienna-lib|g' package.json && \
    npm install --omit=dev

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services ./services
COPY apps/console/server/build ./build
COPY apps/console/server/package.json ./

EXPOSE 3100
CMD ["node", "build/server.cjs"]
