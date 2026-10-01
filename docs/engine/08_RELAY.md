# 🌐 Multi-Region Relay Subsystem (`engine/`)

The Relay Subsystem allows individual Go Engine instances to act as forwarding proxy nodes in multi-region deployments.

---

## 1. Capabilities

1. **Heartbeat Protocol**: Periodically transmits load status, active connections, and node health to the central SaaS API (`POST /api/v1/relays/heartbeat`).
2. **Autonomous Recovery**: If the central SaaS API becomes unreachable, relay nodes continue serving local proxy connections in fallback mode.
