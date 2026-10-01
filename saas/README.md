# 🌐 Proxy Redirector — SaaS Cloud Backend & Static IP Orchestrator

> منصة سحابية متقدمة ومكتملة مبنية بلغة **Node.js و TypeScript** لإدارة اشتراكات البروكسيات، المصادقة المركزية، خوادم التوجيه (Relays)، قياس استهلاك الباندويث الفوري، وإدارة البروكسيات الثابتة المخصصة (Dedicated Static IPs).

![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Prisma ORM](https://img.shields.io/badge/Prisma-6-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Redis](https://img.shields.io/badge/Redis-7-DC382D)

---

## 🚀 Features & Architecture

- 🔐 **Identity & Auth System** — Access & Refresh JWT tokens with automatic Redis revocation blacklist and hardware device fingerprinting.
- 💳 **Billing & Stripe Integration** — Subscriptions, checkout sessions, webhook signature validation, and tier access control (`Free`, `Basic`, `Pro`, `Business`).
- 🏛️ **Static Proxy Orchestrator** — Dedicated 1:1 leasing for static residential and datacenter IPs with ASN fraud score verification.
- 📊 **Real-time Bandwidth Metering** — Sliding-window Redis token-bucket bandwidth tracking with automatic daily PostgreSQL log aggregation.
- 🛡️ **Zero-Trust Security Stack** — RBAC authorization guards, Redis-backed sliding-window rate limiters, and Zod runtime schema validations.
- ⚙️ **Background Workers** — Automatic relay health heartbeat monitoring and expired session cleanups.

---

## 📁 Project Structure

```text
saas/
├── prisma/
│   └── schema.prisma         # Canonical database schema (PostgreSQL)
├── src/
│   ├── app.ts                # Express application factory
│   ├── server.ts             # HTTP server bootstrap & worker lifecycle
│   ├── config/               # Zod-validated environment config
│   ├── database/             # Prisma & Redis client singletons
│   ├── middlewares/          # JWT auth, RBAC, rate-limiting, error handler
│   ├── modules/              # Domain modules:
│   │   ├── auth/             # Registration, login, refresh, logout
│   │   ├── users/            # Profiles, devices, API keys
│   │   ├── billing/          # Plans, Stripe checkout, webhooks
│   │   ├── proxies/          # Region discovery, static proxy leasing
│   │   ├── relays/           # Engine node heartbeats & load balancing
│   │   ├── usage/            # Bandwidth analytics and daily logs
│   │   └── admin/            # Fleet overview & platform statistics
│   ├── workers/              # Proxy health worker & usage aggregator
│   └── utils/                # Crypto, JWT, logger, and API responses
├── Dockerfile                # Production multi-stage Docker build
└── docker-compose.yml        # PostgreSQL, Redis, and SaaS API stack
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL & Redis (or use Docker Compose)

### 2. Setup & Environment
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate Prisma Client
npx prisma generate
```

### 3. Running the Server
```bash
# Development mode with hot-reload
npm run dev

# Build TypeScript to dist/
npm run build

# Start production server
npm start

# Run automated tests
npm test
```

### 4. Running with Docker Compose
```bash
docker-compose up -d
```
