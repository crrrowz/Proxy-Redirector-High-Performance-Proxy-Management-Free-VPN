# 🐳 Self-Hosted Supabase Setup Guide

This guide explains how to spin up a production-ready, self-hosted **Supabase** instance (PostgreSQL 16, Supabase Studio, GoTrue Auth, PostgREST, and Kong API Gateway) for **Proxy Redirector SaaS**.

---

## 1. Quick Start with Docker Compose

Navigate to the `saas/` directory and start the Supabase stack:

```bash
cd saas

# Start all Supabase services in the background
docker-compose -f docker-compose.supabase.yml up -d
```

---

## 2. Port Bindings & Service Map

| Service | Container Name | Host Port | Internal Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `supabase-db` | `54322` | `5432` | PostgreSQL database engine with `pgvector` & UUID extensions |
| **Supabase Studio** | `supabase-studio` | `8000` | `3000` | Web graphical database management UI |
| **Kong API Gateway**| `supabase-kong` | `54321` | `8000` | Unified API router for REST, Auth, and Storage |
| **Redis Cache** | `supabase-redis` | `6379` | `6379` | Token blacklist & sliding window rate limiter |
| **SaaS API Server** | `proxy-redirector-saas-api` | `4000` | `4000` | Node.js / TypeScript Clean Architecture API server |

---

## 3. Database Migration & Initial Seeding

Once the database is healthy, initialize the Prisma schema and seed default plans, admin credentials, and static proxies:

```bash
# Generate Prisma Client
npx prisma generate

# Apply Database Migrations
npx prisma migrate dev --name init_supabase

# Execute the Seeding Engine
npm run prisma:seed
```

### Seeded Credentials:
- **Default Administrator**: `admin@proxyredirector.io`
- **Initial Password**: `AdminSecret123!`
- **Supabase Studio Web Dashboard**: [http://localhost:8000](http://localhost:8000)
