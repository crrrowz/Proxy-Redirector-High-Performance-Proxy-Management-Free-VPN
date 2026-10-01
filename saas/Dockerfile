# syntax=docker/dockerfile:1.7

# ═══════════════════════════════════════════════════════════════════
# Stage 1: Dependency Installation & Prisma Client Generation
# ═══════════════════════════════════════════════════════════════════
FROM node:22-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy lockfile and package manifests
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci && npx prisma generate

# ═══════════════════════════════════════════════════════════════════
# Stage 2: TypeScript Compilation
# ═══════════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TypeScript
RUN npm run build

# ═══════════════════════════════════════════════════════════════════
# Stage 3: Minimal Hardened Production Runtime
# ═══════════════════════════════════════════════════════════════════
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Create unprivileged system group and user
RUN addgroup --system --gid 10001 saasgroup && \
    adduser --system --uid 10001 saasuser -G saasgroup

# Copy dependencies and compiled distribution with unprivileged ownership
COPY --from=deps --chown=saasuser:saasgroup /app/node_modules ./node_modules
COPY --from=deps --chown=saasuser:saasgroup /app/prisma ./prisma
COPY --from=builder --chown=saasuser:saasgroup /app/dist ./dist
COPY --chown=saasuser:saasgroup package.json ./

# Drop all privileges
USER 10001:10001

EXPOSE 4000

# Native Node.js HTTP healthcheck probe without curl/wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["node", "-e", "const http = require('http'); const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 4000, path: '/health', timeout: 3000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"]

# Exec form of CMD for instant SIGTERM signal propagation
CMD ["node", "dist/server.js"]
