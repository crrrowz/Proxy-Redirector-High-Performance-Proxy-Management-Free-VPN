# 🛡️ Security Policy

We take the security of **Proxy Redirector & Free VPN** seriously. This document outlines our supported versions, security guidelines, and reporting procedures for security vulnerabilities.

---

## 🔒 Supported Versions

Only the latest active major version receives security updates and vulnerability patches.

| Version | Supported | Maintenance State |
| :--- | :---: | :--- |
| **v3.x (Current Go + Node.js SaaS)** | 🟢 Yes | Actively Maintained & Patched |
| **v2.x (Legacy Python)** | 🔴 No | End-of-Life / Decommissioned |
| **v1.x** | 🔴 No | End-of-Life |

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability or potential threat in this repository, **DO NOT open a public issue**. Publicly disclosing a vulnerability can endanger users before a fix is available.

### Responsible Disclosure Protocol:
1. **GitHub Security Advisory (Recommended)**:
   - Navigate to the repository's [Security Advisories](https://github.com/crrrowz/Proxy_redirector/security/advisories/new) tab and click **"Report a vulnerability"** to open a private disclosure draft with maintainer **Hassanein Hassan Alkahafji** ([@crrrowz](https://github.com/crrrowz)).
2. **Direct Contact**:
   - Reach out privately via GitHub to [@crrrowz](https://github.com/crrrowz) or email: `103160815+crrrowz@users.noreply.github.com`.
3. **Include in Your Report**:
   - Subsystem affected (`engine`, `client`, `saas`, `static`, or `scripts`).
   - Step-by-step reproduction steps or Proof-of-Concept (PoC).
   - Potential impact (e.g., Denial of Service, token leakage, unauthorized bypass).
   - Suggested mitigations or patches (if available).

### Our Commitment:
- **Acknowledgement**: Receipt acknowledged within **48 hours**.
- **Assessment**: Evaluated and verified within **5 business days**.
- **Remediation & Release**: A coordinated security patch released with full credit given to the researcher.

---

## 🛡️ Core Security Architecture & Guarantees

The codebase enforces defensive security across all layers:

1. **Zero-Leak Failover (`INV-SEC-01`)**:
   - In-flight TCP sessions terminate cleanly during proxy switchover; subsequent handshakes target newly elected candidates with zero plain text egress leaks.
2. **Credential Sanitization (`INV-SEC-02`)**:
   - Proxy authentication credentials, passwords, and user authorization tokens are stripped before writing to structured application logs.
3. **Idempotency & Token Revocation**:
   - All state-mutating SaaS operations support `Idempotency-Key` headers stored in Redis.
   - JWT tokens are immediately revokable via Redis token blacklists (`token:revoked:<jti>`).
4. **Subnet Confinement & LAN Bypass**:
   - Local proxy listeners (`0.0.0.0`) allow LAN connections only with authorization or explicit local device tracking.
5. **No Dangerous Code Execution**:
   - The project strictly prohibits `eval()`, unparameterized shell subprocesses (`shell=True`), or dynamic code injection.
