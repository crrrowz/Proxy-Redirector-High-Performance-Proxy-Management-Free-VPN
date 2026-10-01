# syntax=docker/dockerfile:1.7

# Stage 1: Base Runtime Engine
FROM golang:1.23-alpine AS base

ENV CGO_ENABLED=0 \
    GOOS=linux

WORKDIR /workspace/app

RUN apk add --no-cache git ca-certificates tzdata

# Stage 2: Dependencies Layer (Cached)
FROM base AS deps
WORKDIR /workspace/app
COPY go.mod go.sum* ./
RUN go mod download

# Stage 3: Development Target
FROM deps AS development
WORKDIR /workspace/app
COPY . .
CMD ["sleep", "infinity"]

# Stage 4: Automated Test Target
FROM deps AS test
WORKDIR /workspace/app
COPY . .
ENTRYPOINT ["go", "test"]
CMD ["-v", "./..."]

# Stage 5: Production Builder
FROM deps AS builder
WORKDIR /workspace/app
COPY . .
RUN go build -trimpath -ldflags="-s -w" -o /app/main .

# Stage 6: Distroless / Minimal Production Target
FROM scratch AS production
COPY --from=base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=base /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/main /main
USER 10001:10001
ENTRYPOINT ["/main"]

# Stage 7: Local Export Target
FROM scratch AS export
COPY --from=builder /app/main /main
