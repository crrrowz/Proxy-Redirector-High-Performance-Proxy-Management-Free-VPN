# syntax=docker/dockerfile:1.7

# ═══════════════════════════════════════════════════════════════════
# Stage 1: Build & Compile Go Engine Daemon
# ═══════════════════════════════════════════════════════════════════
FROM golang:alpine AS builder

WORKDIR /workspace

# Install ca-certificates and git
RUN apk add --no-cache ca-certificates git

# Copy Go workspace files
COPY go.work go.work.sum ./
COPY shared/ ./shared/
COPY proto/ ./proto/
COPY client/ ./client/
COPY engine/ ./engine/

WORKDIR /workspace/engine

# Download dependencies
RUN go mod download

# Compile statically linked binary with stripped debug symbols
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/engine ./cmd/engine

# ═══════════════════════════════════════════════════════════════════
# Stage 2: Hardened Minimal Production Runtime
# ═══════════════════════════════════════════════════════════════════
FROM alpine:3.20 AS runner

WORKDIR /app

# Install ca-certificates and curl for healthcheck
RUN apk add --no-cache ca-certificates tzdata curl && \
    addgroup -g 10001 -S enginegroup && \
    adduser -u 10001 -S engineuser -G enginegroup && \
    mkdir -p /app/data && \
    chown -R engineuser:enginegroup /app

# Copy compiled binary from builder
COPY --from=builder --chown=engineuser:enginegroup /app/engine /app/engine
COPY --from=builder --chown=engineuser:enginegroup /workspace/engine/engine_config.json /app/engine_config.json

# Drop privileges
USER 10001:10001

# Expose SOCKS5, HTTP, REST API, and gRPC ports
EXPOSE 1080 8080 9090 50051

# Healthcheck probe against the REST API status endpoint
HEALTHCHECK --interval=20s --timeout=4s --start-period=5s --retries=3 \
    CMD ["curl", "-fsS", "http://127.0.0.1:9090/api/status"]

# Exec form for clean SIGTERM signal propagation
CMD ["/app/engine"]
