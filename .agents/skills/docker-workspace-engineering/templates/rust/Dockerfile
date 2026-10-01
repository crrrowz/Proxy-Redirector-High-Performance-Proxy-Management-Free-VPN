# syntax=docker/dockerfile:1.7

# Stage 1: Base Runtime Engine
FROM rust:1.82-slim-bookworm AS base

WORKDIR /workspace/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Development Target
FROM base AS development
WORKDIR /workspace/app
COPY . .
CMD ["sleep", "infinity"]

# Stage 3: Automated Test Target
FROM base AS test
WORKDIR /workspace/app
COPY . .
ENTRYPOINT ["cargo", "test"]

# Stage 4: Production Builder
FROM base AS builder
WORKDIR /workspace/app
COPY . .
RUN cargo build --release

# Stage 5: Minimal Production Runtime
FROM debian:bookworm-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /workspace/app/target/release/app /app/app
ENTRYPOINT ["/app/app"]

# Stage 6: Local Export Target
FROM scratch AS export
COPY --from=builder /workspace/app/target/release/app /app
