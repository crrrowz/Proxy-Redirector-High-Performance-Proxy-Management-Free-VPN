# 🌐 SaaS Cloud Backend & Admin Platform — Master Architecture Specification (Node.js & TypeScript)

**Task ID**: `TASK-SAAS-NODEJS-V3`  
**Status**: `APPROVED / ARCHITECTURE BLUEPRINT`  
**Architect**: System Architecture Specialist (OpenSpace & Enterprise Standards)  
**Target Path**: `saas/` (Node.js 20+ / TypeScript ESM / Prisma ORM / PostgreSQL / Redis)  
**Standard**: Modular Monolith ➔ Scalable Microservices Ready  

---

## 1. Executive Summary & Architectural Invariants

### 1.1 Purpose
Transform the draft SaaS specifications into a complete, enterprise-grade **Node.js + TypeScript** backend application responsible for:
1. **User Identity & Multi-tenancy**: Authentication (JWT, Refresh Tokens, OAuth2, Device Fingerprinting), RBAC (`USER`, `PRO_USER`, `ADMIN`, `SUPPORT`).
2. **Subscriptions & Billing Engine**: Stripe Billing (Checkout Sessions, Webhooks, Customer Portals, Usage Tiers: Free, Basic, Pro, Business).
3. **Fleet & Relay Orchestration**: Health tracking, session token issuance, geographic routing (US, EU, Asia), load distribution for Go Engine nodes.
4. **Bandwidth Metering & Quotas**: Real-time Redis token-bucket bandwidth tracking, session quotas, and periodic PostgreSQL usage aggregation.
5. **Admin & Analytics APIs**: Telemetry ingestion, proxy pool health analytics, domain blocklist distribution.

### 1.2 Core Architectural Invariants
* **`INV-SAAS-01: Zero-Trust Token Verification`**: Every API route (except public auth and Stripe webhooks) must validate JWT signatures and check revocation against the Redis token blacklist (`token:revoked:<jti>`).
* **`INV-SAAS-02: Strict Schema Validation`**: 100% of ingress HTTP payloads, route parameters, and query strings must be validated using `Zod` schemas before controller invocation.
* **`INV-SAAS-03: Idempotent Webhook Processing`**: Stripe webhooks must log events to `stripe_events` table and ensure exactly-once execution using transactional database locks.
* **`INV-SAAS-04: Strict Error Uniformity`**: All API responses must adhere to the standard envelope `{ success: boolean, data?: T, error?: { code: string, message: string, details?: any } }`.

---

## 2. Directory Structure & File Manifest (Node.js / TypeScript)

```text
saas/
├── package.json                    # Dependencies: fastify/express, prisma, ioredis, zod, stripe, jsonwebtoken
├── tsconfig.json                   # Strict TypeScript compiler options
├── docker-compose.yml              # PostgreSQL, Redis, pgAdmin, SaaS API
├── Dockerfile                      # Multi-stage production build (Node.js 20-alpine)
├── .env.example                    # Exhaustive environment variables template
├── prisma/
│   ├── schema.prisma               # Canonical PostgreSQL database schema
│   ├── migrations/                 # Versioned SQL migrations
│   └── seed.ts                     # Initial seed for plans, admin user, and default blocklists
│
└── src/
    ├── app.ts                      # Express/Fastify application factory and middleware wiring
    ├── server.ts                   # HTTP listener, graceful shutdown handlers, and worker triggers
    │
    ├── config/                     # Environment configuration & Zod validator
    │   ├── index.ts                # Validated configuration singleton
    │   └── schema.ts               # Zod validation schema for process.env
    │
    ├── database/                   # Data access connections
    │   ├── prisma.ts               # PrismaClient singleton with query logging
    │   └── redis.ts                # ioredis client with reconnect backoff and pub/sub
    │
    ├── modules/                    # Domain modules (Controller + Service + Repository + DTO)
    │   ├── auth/
    │   │   ├── auth.controller.ts  # /api/v1/auth (register, login, refresh, logout, 2fa)
    │   │   ├── auth.service.ts     # Password hashing (bcrypt), token minting, fingerprinting
    │   │   ├── auth.schema.ts      # Zod DTOs for credentials & tokens
    │   │   └── auth.routes.ts      # Fastify/Express route declarations
    │   │
    │   ├── users/
    │   │   ├── users.controller.ts # /api/v1/users (profile, devices, api-keys)
    │   │   ├── users.service.ts    # User CRUD, device limits, active sessions
    │   │   └── users.routes.ts
    │   │
    │   ├── billing/
    │   │   ├── billing.controller.ts # /api/v1/billing (plans, checkout, portal)
    │   │   ├── billing.service.ts    # Stripe SDK integration, subscription lifecycle
    │   │   ├── webhook.controller.ts # /api/v1/billing/webhook (raw body signature check)
    │   │   └── billing.routes.ts
    │   │
    │   ├── proxies/
    │   │   ├── proxies.controller.ts # /api/v1/proxies (regions, dynamic relay assignment)
    │   │   ├── proxies.service.ts    # Relay scoring, geographic filtering, pool health
    │   │   └── proxies.routes.ts
    │   │
    │   ├── relays/
    │   │   ├── relays.controller.ts  # /api/v1/relays (heartbeat, session token verification)
    │   │   ├── relays.service.ts     # Relay node registration, TLS cert coordination
    │   │   └── relays.routes.ts
    │   │
    │   ├── usage/
    │   │   ├── usage.controller.ts   # /api/v1/usage (bandwidth consumption, remaining quota)
    │   │   ├── usage.service.ts      # Token-bucket enforcement, quota checks
    │   │   └── usage.routes.ts
    │   │
    │   └── admin/
    │       ├── admin.controller.ts   # /api/v1/admin (fleet overview, user management, audit logs)
    │       ├── admin.service.ts      # Platform-wide metrics, system configurations
    │       └── admin.routes.ts
    │
    ├── middlewares/                # Core HTTP Middlewares
    │   ├── authenticate.ts         # JWT validation & user attachment
    │   ├── authorize.ts            # Role-Based Access Control (RBAC) guard
    │   ├── rateLimiter.ts          # Redis-backed sliding window rate limiter
    │   ├── validate.ts             # Zod validation middleware for req.body / req.query
    │   ├── errorHandler.ts         # Global centralized error handler
    │   └── requestLogger.ts        # Structured JSON logging (Pino/Winston)
    │
    ├── workers/                    # Background Cron & Queue Workers
    │   ├── proxyHealthWorker.ts    # Periodic health check dispatcher for managed relays
    │   ├── usageAggregator.ts      # Flushes Redis usage counters to PostgreSQL usage_logs
    │   └── subscriptionChecker.ts  # Grace-period and expiration worker for subscriptions
    │
    ├── types/                      # Ambient & Shared TypeScript Definitions
    │   ├── express.d.ts            # Augmented Request with AuthUser context
    │   └── common.ts               # Pagination, Filter, and API Response interfaces
    │
    └── utils/                      # Helper Utilities
        ├── jwt.ts                  # Sign / Verify / Refresh helper functions
        ├── crypto.ts               # Encrypt / Decrypt / Hashing helpers
        ├── logger.ts               # Pino structured logger instance
        └── apiResponse.ts          # Standard response constructor
```

---

## 3. Database Schema (Prisma / PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  PRO_USER
  ENTERPRISE
  ADMIN
  SUPPORT
}

enum SubscriptionStatus {
  INCOMPLETE
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

enum RelayStatus {
  ONLINE
  DEGRADED
  OFFLINE
  MAINTENANCE
}

model User {
  id               String          @id @default(uuid())
  email            String          @unique
  passwordHash     String
  name             String?
  role             Role            @default(USER)
  emailVerified    Boolean         @default(false)
  stripeCustomerId String?         @unique
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  devices          Device[]
  subscriptions    Subscription[]
  sessions         ProxySession[]
  usageLogs        UsageLog[]
  auditLogs        AuditLog[]
  apiKeys          ApiKey[]

  @@map("users")
}

model Plan {
  id               String          @id @default(uuid())
  name             String          @unique // "Free", "Basic", "Pro", "Business"
  stripePriceId    String?         @unique
  priceMonthly     Int             // In cents ($5.00 = 500)
  bandwidthLimitGb Int             // e.g. 50, 200, 1000
  maxDevices       Int             // e.g. 1, 2, 5, 15
  allowedRegions   String[]        // ["US", "EU", "ASIA"]
  hasAdBlock       Boolean         @default(true)
  hasDedicatedIps  Boolean         @default(false)
  isActive         Boolean         @default(true)

  subscriptions    Subscription[]

  @@map("plans")
}

model Subscription {
  id               String             @id @default(uuid())
  userId           String
  planId           String
  stripeSubId      String?            @unique
  status           SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean          @default(false)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  user             User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan             Plan               @relation(fields: [planId], references: [id])

  @@map("subscriptions")
}

model Device {
  id               String          @id @default(uuid())
  userId           String
  fingerprint      String          // Hardware / OS UUID hash
  deviceName       String
  deviceOs         String          // "Windows 11", "Ubuntu 22.04", "macOS"
  lastIp           String?
  lastActive       DateTime        @default(now())
  createdAt        DateTime        @default(now())

  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, fingerprint])
  @@map("devices")
}

model RelayServer {
  id               String          @id @default(uuid())
  name             String          // "us-east-relay-01"
  region           String          // "US-East"
  country          String          // "US"
  publicIp         String          @unique
  grpcPort         Int             @default(50051)
  socksPort        Int             @default(1080)
  httpPort         Int             @default(8080)
  status           RelayStatus     @default(ONLINE)
  currentLoad      Float           @default(0.0) // 0.0 to 100.0%
  activeSessions   Int             @default(0)
  secretKeyHash    String
  lastHeartbeat    DateTime        @default(now())

  sessions         ProxySession[]

  @@map("relay_servers")
}

model ProxySession {
  id               String          @id @default(uuid())
  userId           String
  relayId          String
  sessionToken     String          @unique
  bytesUp          BigInt          @default(0)
  bytesDown        BigInt          @default(0)
  connectedAt      DateTime        @default(now())
  disconnectedAt   DateTime?
  clientIp         String

  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  relay            RelayServer     @relation(fields: [relayId], references: [id])

  @@map("proxy_sessions")
}

model UsageLog {
  id               String          @id @default(uuid())
  userId           String
  date             DateTime        @db.Date
  bytesTransferred BigInt
  createdAt        DateTime        @default(now())

  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("usage_logs")
}

model ApiKey {
  id               String          @id @default(uuid())
  userId           String
  keyHash          String          @unique
  prefix           String          // First 8 chars for display
  name             String
  expiresAt        DateTime?
  createdAt        DateTime        @default(now())

  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("api_keys")
}

model AuditLog {
  id               String          @id @default(uuid())
  userId           String?
  action           String          // "LOGIN", "SUBSCRIPTION_UPGRADE", "DEVICE_REVOKED"
  ipAddress        String?
  metadata         Json?
  createdAt        DateTime        @default(now())

  user             User?           @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
}
```

---

## 4. RESTful API Specification (OpenAPI Compatible)

### 4.1 Authentication Endpoints (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account with email/password | No |
| `POST` | `/api/v1/auth/login` | Authenticate with credentials and device info, mint Access+Refresh JWT | No |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh token for new access token | No |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token and add to Redis blacklist | Yes |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile and subscription status | Yes |

### 4.2 Proxy & Relay Connect Endpoints (`/api/v1/proxies`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/proxies/regions` | List available proxy regions allowed for user's plan | Yes |
| `POST` | `/api/v1/proxies/connect` | Request optimized relay endpoint and short-lived session token | Yes |
| `POST` | `/api/v1/proxies/disconnect` | Notify session termination and flush bandwidth telemetry | Yes |

### 4.3 Billing & Stripe Endpoints (`/api/v1/billing`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/billing/plans` | Fetch public pricing plans and tier features | No |
| `POST` | `/api/v1/billing/checkout` | Create Stripe Checkout Session for subscription upgrade | Yes |
| `POST` | `/api/v1/billing/portal` | Create Stripe Customer Portal session for billing management | Yes |
| `POST` | `/api/v1/billing/webhook` | Stripe webhook listener (signature verified) | No (Stripe sig) |

---

## 5. Integration Verification & Acceptance Matrix

| Gate ID | Subsystem | Verification Criterion | Status |
| :--- | :--- | :--- | :--- |
| **G-SAAS-01** | Type Safety | `npm run build` (TypeScript tsc) compiles with 0 errors | PENDING |
| **G-SAAS-02** | Database Layer | Prisma schema generates client and validates against PostgreSQL | PENDING |
| **G-SAAS-03** | Auth Engine | JWT access token verification + Redis revocation check passes | PENDING |
| **G-SAAS-04** | Billing Integration| Stripe webhook processes `checkout.session.completed` idempotently | PENDING |
| **G-SAAS-05** | Metering | Bandwidth consumption aggregates in Redis and syncs to PostgreSQL | PENDING |
