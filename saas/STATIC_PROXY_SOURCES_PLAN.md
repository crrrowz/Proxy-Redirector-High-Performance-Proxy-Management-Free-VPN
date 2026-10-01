# 🏛️ Static & Dedicated Proxy Sources Architecture Plan (Zero-Drift & High-Reliability)

**Document ID**: `PLAN-STATIC-PROXY-SOURCES-V3`  
**Status**: `APPROVED / ARCHITECTURE SPECIFICATION`  
**Target Systems**: `saas/` (Node.js/Prisma Pool Orchestrator) & `proxy-redirector-v3/engine` (Proxy Manager & Failover)  
**Standard**: Carrier-Grade Static IP Lifecycle, Dedicated Leasing, Fraud Score Filtering, & Fault-Tolerant Redundancy  

---

## 1. Executive Summary & Problem Context

### 1.1 Context
In production enterprise environments, rotating or ephemeral proxies cause session drops, security checkpoints (Cloudflare / Akamai / CAPTCHA), and account bans on target platforms.
The system requires a dedicated architecture for **Static, Fixed, High-Reliability Proxies (Static ISP / Datacenter / Private VPS Nodes)** that guarantee:
1. **IP Pinning & Stickiness**: The proxy IP address remains constant across hours/days/weeks per user session.
2. **Dedicated Leasing & No Overlap**: Premium users receive exclusive 1:1 dedicated static IPs not shared with other tenants.
3. **ISP & ASN Legitimacy**: Verification of ASN classification (Residential / Business ISP vs dirty hosting subnets) and low fraud scores (< 10/100).
4. **Hot-Standby Failover**: In the rare event a static node goes offline, an identical-region static reserve IP is hot-swapped within 300ms without breaking TLS handshake state.

---

## 2. Multi-Tier Static Proxy Source Taxonomy

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              STATIC PROXY SOURCE TIERS                                 │
│                                                                                        │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐                  │
│  │ Tier 1: Private VPS Fleet    │    │ Tier 2: Static ISP / Resid.  │                  │
│  │ (Self-Hosted Dante/Squid)    │    │ (BrightData / IPRoyal / Oxy) │                  │
│  │ - Dedicated 1Gbps Uplinks    │    │ - Clean Residential ASN      │                  │
│  │ - Fixed Static IPv4/IPv6     │    │ - High Anti-Bot Trust Score  │                  │
│  │ - Full Root & TLS Control    │    │ - Permanent Assigned Subnets │                  │
│  └──────────────┬───────────────┘    └──────────────┬───────────────┘                  │
│                 │                                   │                                  │
│                 └─────────────────┬─────────────────┘                                  │
│                                   ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐                  │
│  │ Tier 3: Static Datacenter Dedicated Pools (Webshare / Rayobyte)   │                  │
│  │ - 99.99% Hardware Uptime SLA                                     │                  │
│  │ - Low Latency & High Concurrency                                 │                  │
│  └────────────────────────────────┬─────────────────────────────────┘                  │
└───────────────────────────────────┼────────────────────────────────────────────────────┘
                                    │ Ingestion & Verification Pipeline
┌───────────────────────────────────▼────────────────────────────────────────────────────┐
│                  Central Static Pool Manager (Node.js SaaS / Go Engine)                │
│  - ASN & Fraud Score Validator (MaxMind + IPQualityScore)                              │
│  - Dedicated Lease Allocator (Exclusive user binding)                                  │
│  - Continuous Sub-Second Latency & Packet Loss Prober                                  │
│  - Automated Standby Hot-Swap Pool                                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Source Specifications & Ingestion Adapters

### 3.1 Tier 1: Autonomous Private VPS Mesh (Self-Hosted)
* **Infrastructure**: Low-cost VPS nodes deployed across major transit hubs (Hetzner, OVH, Linode, DigitalOcean, Vultr) in key regions (`US-East`, `US-West`, `EU-Central`, `UK-London`, `SG-Singapore`, `JP-Tokyo`).
* **Software Stack on VPS Nodes**:
  - `dante-server` (SOCKS5 daemon with mutual TLS / IP authorization).
  - `squid` (HTTP CONNECT tunnel with HTTP/2 and SSL Bumping disabled for privacy).
  - `wireguard` (Kernel-level tunnel link between SaaS central relays and static VPS egress).
* **Guarantees**: 100% dedicated bandwidth, zero third-party logging, zero IP recycling.

### 3.2 Tier 2: Static Commercial ISP & Residential Providers
* **Adapter API Integration**:
  - **IPRoyal / BrightData Static ISP**: REST API webhooks for automated IP provisioning, whitelist configuration, and sub-user credential generation.
  - **Webshare Dedicated DC**: Bulk automated rotation of dead static slots via REST API.
* **Auto-Replenishment**:
  - If any commercial static IP fails health checks for > 15 minutes, the automated provider adapter calls the provider API to replace the defective IP with a fresh static IP in the same city/region.

---

## 4. Static Proxy Lifecycle & State Machine

```text
               ┌──────────────────────────────────────────┐
               │              1. PROVISIONING             │
               │ (Import / API Purchase / VPS Deployment) │
               └────────────────────┬─────────────────────┘
                                    │
               ┌────────────────────▼─────────────────────┐
               │         2. FORENSIC VERIFICATION         │
               │ - ASN & Geo Validation (MaxMind GeoIP2)  │
               │ - Fraud Score Probe (< 15 on IPQS)       │
               │ - Latency (< 120ms) & SSL Handshake      │
               └────────────────────┬─────────────────────┘
                                    │ Passed Verification
               ┌────────────────────▼─────────────────────┐
               │          3. AVAILABLE IN STATIC POOL     │
               │ (Ready for dedicated lease allocation)   │
               └──────────┬───────────────────▲───────────┘
                          │ Lease Assigned    │ Lease Released / Expired
               ┌──────────▼───────────────────┴───────────┐
               │          4. DEDICATED LEASED (ACTIVE)    │
               │ - 1:1 bound to specific User / Device    │
               │ - Excluded from dynamic rotation pools   │
               │ - Pinned IP guarantee                    │
               └────────────────────┬─────────────────────┘
                                    │ Health Failure (> 3 checks)
               ┌────────────────────▼─────────────────────┐
               │          5. HOT-STANDBY SWAP & QUARANTINE│
               │ - Replace with same-region standby IP    │
               │ - Quarantine defective IP for 1 hour     │
               │ - Auto-retire if persistent failure      │
               └──────────────────────────────────────────┘
```

---

## 5. Database Schema Extensions (Prisma / PostgreSQL & SQLite)

### 5.1 Prisma Schema for Static IP Management (`saas/prisma/schema.prisma`)

```prisma
enum ProxyPoolType {
  STATIC_DEDICATED  // 1:1 exclusive user assignment
  STATIC_SHARED     // Small pool (max 3 users)
  DYNAMIC_ROTATING  // Public / scraping fallback
}

enum ProxyTier {
  TIER_1_PRIVATE_VPS
  TIER_2_STATIC_ISP
  TIER_3_STATIC_DATACENTER
}

model StaticProxy {
  id               String        @id @default(uuid())
  ip               String        @unique
  port             Int
  protocol         String        // "socks5", "http"
  username         String?
  password         String?
  poolType         ProxyPoolType @default(STATIC_DEDICATED)
  tier             ProxyTier     @default(TIER_2_STATIC_ISP)
  providerName     String        // "Self-Hosted", "Webshare", "BrightData", "IPRoyal"
  
  // Geolocation & Network Quality
  countryCode      String        // "US", "DE", "GB", "SG"
  city             String?
  asn              Int?          // e.g. 7018 (AT&T Services), 7922 (Comcast)
  ispName          String?       // "Comcast Cable Communications"
  fraudScore       Int           @default(0) // 0 - 100 (lower is cleaner)
  
  // Health & Performance
  isAlive          Boolean       @default(true)
  lastLatencyMs    Float         @default(0.0)
  uptimePercent    Float         @default(100.0)
  consecutiveFails Int           @default(0)
  lastCheckedAt    DateTime      @default(now())

  // Dedicated Leasing
  assignedUserId   String?       @unique // When leased exclusively
  assignedAt       DateTime?
  leaseExpiresAt   DateTime?

  // Relations
  assignedUser     User?         @relation(fields: [assignedUserId], references: [id], onDelete: SetNull)

  @@index([countryCode, poolType, isAlive])
  @@index([assignedUserId])
  @@map("static_proxies")
}
```

---

## 6. Structural Invariants & Guarantees for Static Proxies

1. **`INV-STAT-01: Zero IP Churn on Leased Proxies`**: A proxy in `STATIC_DEDICATED` status assigned to a user must never be switched or rotated unless a hard network failure occurs.
2. **`INV-STAT-02: Strict ASN & Cleanliness Gate`**: No proxy with a Fraud Score > 20 or an unknown ASN can be placed into the `TIER_1` or `TIER_2` static pool.
3. **`INV-STAT-03: Hot-Standby Affinity`**: If failover is triggered for a leased static IP, the replacement IP must match the exact same `countryCode` and `city` (or nearest metropolitan area).
4. **`INV-STAT-04: Sub-Second Heartbeat Probing`**: Static proxies are probed every 30 seconds via synthetic non-intrusive TCP SYN / HTTP HEAD requests without generating noticeable customer bandwidth consumption.

---

## 7. Verification & Operational Acceptance Criteria

| Check ID | Component | Verification Command / Metric | Gate Target |
| :--- | :--- | :--- | :--- |
| **G-STAT-01** | Dedicated Binding | Attempt assigning 1 static IP to 2 concurrent users | REJECTED (Enforce 1:1 unique constraint) |
| **G-STAT-02** | Fraud Score Filter | Test proxy with simulated fraud score = 45 | QUARANTINED (Bypassed from VIP pool) |
| **G-STAT-03** | Hot-Swap SLA | Kill active static VPS proxy container | Replacement assigned within ≤ 500ms |
| **G-STAT-04** | Latency Floor | Measure ping across Tier 1 VPS mesh | Target ≤ 80ms intra-region |
