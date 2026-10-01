# 🤝 Contributing to Proxy Redirector & Free VPN

Thank you for your interest in contributing to **Proxy Redirector & Free VPN**! We welcome contributions from developers of all skill levels. This guide explains our architecture, development workflow, testing standards, and pull request process.

---

## 🌐 Language Policy

All contributions **MUST** be written in **English**:
- Source code (identifiers, types, function names)
- In-code comments and docstrings
- Documentation (`.md` files)
- Commit messages and pull request descriptions
- User-facing error messages and API logs

---

## 🏛️ System Architecture Overview

The repository is organized into three primary tiers:

1. **Tier 1: High-Performance Go Core (`/engine`, `/client`, `/shared`, `/proto`)**:
   - `engine/`: Standalone proxy management daemon with async checker, surge rotator, adblock engine, and SQLite WAL database.
   - `client/`: Wails React 18 GUI and standalone headless CLI (`proxy-cli`) sharing `client/internal/core`.
   - `shared/`: Shared models, Protobuf bindings, and metadata.
   - `proto/`: gRPC Protobuf definitions.
2. **Tier 2: Embedded Web Dashboard (`/engine/static`)**:
   - 6-Tab glassmorphic operational web UI served directly by the engine on port `9090`.
3. **Tier 3: Cloud SaaS Backend (`/saas`)**:
   - Enterprise Node.js 20+ / TypeScript service built with Clean Architecture, Prisma ORM (PostgreSQL/Supabase), Redis caching, and Stripe billing.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Go 1.22+**
- **Node.js 20 LTS+** & **npm 10+**
- **Docker & Docker Compose** (for PostgreSQL, Redis, and Supabase)

### 2. Building Go Components
The repository uses a multi-module `go.work` setup in the root directory:

```powershell
# Verify workspace
go work sync

# Run all Engine unit tests
cd engine
go test -v ./...

# Run all Client unit tests
cd ../client
go test -v ./...

# Build CLI binary
.\scripts\build_cli.ps1
```

### 3. Running the SaaS Backend
```bash
cd saas

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Build TypeScript
npm run build

# Run tests
npm test

# Start development server with hot reload
npm run dev
```

---

## 🧪 Testing Standards & Invariants

Every Pull Request must satisfy our quality gates:

1. **Zero Breaking Changes**:
   - Protobuf signatures in `proto/engine/v1/engine.proto` must remain backward-compatible.
2. **Clean Architecture in SaaS**:
   - Do NOT import database or web framework objects into `saas/src/core/domain/`.
   - Always validate incoming HTTP payloads using `Zod` schemas.
3. **Thread Safety in Go Engine**:
   - All mutations to proxy pool models and adblock rule trees must use `sync.RWMutex`.
4. **Test Coverage**:
   - Add unit tests for every new feature or bugfix.
   - Run `go test ./...` and `npm test` before submitting PRs.

---

## 🔄 Pull Request & Git Workflow

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes using concise, descriptive commit messages:
   ```bash
   git commit -m "feat(saas): implement dedicated static proxy lease allocator"
   ```
3. Push to your fork and open a Pull Request against `main`.
4. Ensure all automated GitHub Actions CI checks pass.

---

## 📜 Code of Conduct

Be respectful, constructive, and collaborative. Treat fellow contributors with kindness and professional empathy.
