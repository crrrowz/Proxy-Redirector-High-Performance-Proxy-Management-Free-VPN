# 🏛️ Project Governance & Decision-Making

This document outlines the governance model, ownership areas, decision-making processes, and release authorities for the **Proxy Redirector & Free VPN** open-source project.

---

## 1. Governance Model

Proxy Redirector operates as a **Maintainer-Driven Meritocracy**:
- **Open Contribution**: Anyone can report issues, propose enhancements, write documentation, and submit Pull Requests.
- **Peer Review**: All code changes undergo automated CI validation and peer review before merging.
- **Maintainer Consensus**: Architectural modifications, security policies, and breaking changes require approval from project maintainers.

---

## 2. Roles & Responsibilities

### Contributors
- Submit bug reports, documentation improvements, and feature pull requests.
- Participate respectfully in issue discussions and pull request reviews.
- Adhere strictly to the [Code of Conduct](CODE_OF_CONDUCT.md) and [Contributing Guide](CONTRIBUTING.md).

### Maintainers
- Review, approve, and merge Pull Requests.
- Guide architectural direction according to [ARCHITECTURE.md](ARCHITECTURE.md).
- Triage and handle security vulnerability disclosures per [SECURITY.md](SECURITY.md).
- Publish official releases, binaries, and version tags.
- Uphold community standards and enforce the Code of Conduct.

---

## 3. Decision-Making Process

1. **Standard Bug Fixes & Non-Breaking Enhancements**:
   - Require review and approval by at least **one Maintainer**.
   - Must pass all automated GitHub Actions CI quality gates (`go test`, `npm test`, `gofmt`, `tsc`).
2. **Architectural & Breaking Changes**:
   - Must be documented first in an architectural proposal or issue.
   - Require consensus among maintainers.
   - Must provide a clear migration path or backward-compatible adapter.

---

## 4. Release Authority

Official releases (GitHub Releases, tagged binaries, and Docker images) are authorized and published exclusively by designated Maintainers following the release validation checklist in [docs/architecture/BUILD_RELEASE.md](docs/architecture/BUILD_RELEASE.md).
