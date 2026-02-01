# syntax=docker/dockerfile:1

# Multi-stage build for Express.js backend
# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat wget

# Stage 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 3: Development Dependencies
FROM base AS dev-deps
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 4: Development
FROM base AS development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
ENV PORT=4000
CMD ["npm", "run", "dev"]

# Stage 5: Builder
FROM base AS builder
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# Stage 6: Production Runner
FROM base AS production
ENV NODE_ENV=production

# Install PM2 globally for process management
RUN npm install -g pm2

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --chown=expressjs:nodejs package.json ./

USER expressjs

EXPOSE 4000
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

# Start with PM2 for graceful shutdown and cluster mode
CMD ["pm2-runtime", "start", "dist/server.js", "--instances", "2", "--max-memory-restart", "500M"]
