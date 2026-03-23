# syntax = docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (workspace-aware)
FROM base AS deps
COPY package*.json ./
COPY ../../services/vienna-lib /app/services/vienna-lib
RUN npm ci --omit=dev

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services ./services
COPY dist ./dist
COPY package.json ./

EXPOSE 3100
CMD ["node", "dist/server.js"]
