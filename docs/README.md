# 📚 Proxy Redirector & Free VPN — Documentation System

Welcome to the canonical documentation for **Proxy Redirector & Free VPN**. This documentation system is organized to serve visitors, users, developers, contributors, and maintainers.

---

## 🗺️ Documentation Map

```text
docs/
├── README.md                      # Documentation Index (This Document)
├── AI_AGENT_WORKFLOW.md           # SOP Protocol for Autonomous AI Coding Agents
├── BUILD_GUIDE.md                 # Multi-Platform Build & Packaging Guide
├── SUPABASE_SETUP.md              # Self-Hosted Supabase Docker Setup Guide
├── RELAY_DEPLOYMENT_GUIDE.md      # Multi-Region VPS Relay Deployment Playbook
├── TROUBLESHOOTING.md             # Runtime Diagnostics, Port Conflicts & FAQs
│
├── architecture/                  # 1. System Architecture & Protocols
│   ├── ARCHITECTURE.md            # Authoritative Master Architecture Specification
│   ├── OVERVIEW.md                # System Topology, Core Flows & Responsibilities
│   ├── MODES.md                   # Self-Hosted Local Mode vs. Cloud SaaS Mode
│   ├── PROTO_SPEC.md              # gRPC Protobuf RPC & Streaming Event Specifications
│   ├── SECURITY.md                # Defense-in-Depth, Token Blacklisting & Confinement
│   ├── ERROR_LOGGING.md           # Structured JSON Logging & RFC 7807 Error Standards
│   ├── TESTING.md                 # Testing Architecture, Coverage & Regression Strategy
│   └── BUILD_RELEASE.md           # Release Automation, Versioning & Packaging
│
├── engine/                        # 2. Go Core Engine Subsystems
│   ├── 01_CHECKER.md              # Async Worker Pool, Latency Probing & SSL Verification
│   ├── 02_MANAGER.md              # Thread-Safe Pool Indexing & Stickiness Algorithm
│   ├── 03_FAILOVER.md             # Circuit Breaker, Cooldowns & Second-Chance Retries
│   ├── 04_ADBLOCK.md              # Trie Matching, Wildcard Regex Rules & Categories
│   ├── 05_ANALYTICS_FETCHER.md    # Reliability Score Formula (0-100) & Auto-Tagging
│   ├── 06_SERVER_CONFIG_MAIN.md   # Daemon Lifecycle, Dynamic Config & REST API
│   ├── 07_DATABASE.md             # SQLite WAL Mode Storage & Legacy JSON Importer
│   ├── 08_RELAY.md                # Multi-Region Relay Forwarding & Heartbeat Protocol
│   └── ENGINE_DASHBOARD_SPEC.md   # 6-Tab Glassmorphic Embedded Web Dashboard (:9090)
│
├── client/                        # 3. Client Layer Subsystems
│   ├── 01_CORE_MODULES.md         # Shared Core Logic (`client/internal/core`)
│   ├── 02_GUI.md                  # Wails v2 / React 18 / TypeScript Desktop Application
│   └── 03_SYSTEM.md               # SOCKS5 (:1080) & HTTP (:8080) Relays with LAN Bypass
│
├── plans/                         # 4. Architecture Decompositions & Roadmaps
│   ├── MASTER_PLAN.md             # Master Engineering Decomposition & Parity Matrix
│   ├── CAPABILITY_INTEGRATION_PLAN.md # Blueprint for Advanced Capabilities (Rules, Protocols, DNS, TUN, etc.)
│   └── ROADMAP_NEXT_PHASE.md      # Future Implementation Stages
│
└── reports/                       # 5. Engineering Quality & Audit Reports
    ├── PROGRESS.md                # Milestone Execution Log
    ├── HANDOFF_AGENT2.md          # Implementation Handoff Contract
    ├── VALIDATION_REPORT_AGENT3.md # Test & CI Verification Report
    └── FINAL_REVIEW_REPORT.md     # Final Quality Gate Sign-Off Report
```

---

## 🧭 Navigating by Persona

### 👤 For End Users & Operators
- **[Installation & Quick Start](../README.md#-quick-start)**: Fastest path to running the proxy engine and client apps.
- **[Headless CLI Guide](../README.md#-headless-cli-usage-proxy-cli)**: Command-line syntax and usage examples.
- **[Troubleshooting Guide](TROUBLESHOOTING.md)**: Resolving port collisions, dead proxy pools, and false-positive adblock rules.

### 💻 For Developers & Contributors
- **[Contributing Guide](../CONTRIBUTING.md)**: Local development setup, testing standards, and pull request workflow.
- **[System Architecture](architecture/ARCHITECTURE.md)**: High-level design, hexagonal boundaries, and structural invariants.
- **[Building from Source](BUILD_GUIDE.md)**: Compiling Go binaries, Wails desktop packages, and Node.js backend.

### 🛡️ For Security Researchers
- **[Security Policy & Vulnerability Reporting](../SECURITY.md)**: Responsible disclosure process and security guarantees.

### 👥 For Maintainers & Governance
- **[Project Governance](../GOVERNANCE.md)**: Decision-making processes, review authority, and release management.
- **[Maintainers & Code Owners](../MAINTAINERS.md)**: Subsystem ownership matrix and contact channels.
- **[Getting Support](../SUPPORT.md)**: Support routing and issue guidelines.
