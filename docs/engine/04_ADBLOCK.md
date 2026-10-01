# 🛡️ AdBlock & Tracker Blocker Subsystem (`engine/internal/adblock/engine.go`)

The AdBlock Engine intercepts and drops DNS queries and HTTP connections targeting known advertising networks, trackers, and telemetry services at the socket level.

---

## 1. Capabilities

1. **High-Speed Matching**: Combines an exact-match hash map with wildcard regex rules for sub-millisecond evaluation.
2. **Category Toggles**: Independent category toggles for:
   - `ads` (Advertising networks)
   - `tracking` (Telemetry and user tracking pixels)
   - `malware` (Known malicious domains)
   - `custom` (User-defined custom rules)
3. **Exception Whitelist**: Whitelist rules take precedence over block rules to prevent false positives on legitimate business domains.
