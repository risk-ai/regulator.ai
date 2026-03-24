# syntax = docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (workspace-aware)
FROM base AS deps
COPY services/vienna-lib /app/node_modules/@vienna/lib
COPY apps/console/server/package.json ./package.json
WORKDIR /app
RUN npm install --omit=dev

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY services/vienna-lib ./node_modules/@vienna/lib
COPY apps/console/server/build ./build
COPY services/vienna-lib/state/schema.sql ./build/schema.sql
COPY apps/console/server/package.json ./

EXPOSE 3100
CMD ["node", "build/server.cjs"]
