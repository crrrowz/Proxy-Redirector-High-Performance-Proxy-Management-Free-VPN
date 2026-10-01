# syntax=docker/dockerfile:1.7

# Stage 1: Base Runtime Engine
FROM node:22-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

WORKDIR /workspace/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies Installation
FROM base AS deps
WORKDIR /workspace/app
COPY package*.json pnpm-lock.yaml* yarn.lock* bun.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm install; fi

# Stage 3: Development Target
FROM deps AS development
WORKDIR /workspace/app
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev"]

# Stage 4: Test Target
FROM deps AS test
WORKDIR /workspace/app
ENV NODE_ENV=test
COPY . .
ENTRYPOINT ["npm", "test"]

# Stage 5: Production Builder
FROM deps AS builder
WORKDIR /workspace/app
COPY . .
RUN if npm run | grep -q "build"; then npm run build; fi

# Stage 6: Production Runtime Target
FROM base AS production
COPY --from=builder /workspace/app/node_modules ./node_modules
COPY --from=builder /workspace/app .
CMD ["npm", "start"]

# Stage 7: Local Export Target (for static builds/bundles via --target export --output .)
FROM scratch AS export
COPY --from=builder /workspace/app/dist/ ./dist/
