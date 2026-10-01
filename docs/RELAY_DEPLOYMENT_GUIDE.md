# 🚀 Multi-Region VPS Relay Node Deployment Guide

This guide describes how to deploy and connect remote **Proxy Redirector Relay Nodes** across multi-region VPS servers (US-East, EU-Central, Asia-Pacific) back to the central SaaS platform.

---

## 1. Automated One-Click Linux Deployment (Ubuntu / Debian)

On any fresh Ubuntu (20.04/22.04/24.04 LTS) or Debian (11/12) VPS instance, execute:

```bash
curl -fsSL https://raw.githubusercontent.com/crrrowz/Proxy_redirector/main/scripts/deploy_relay.sh | sudo bash -s -- \
  SAAS_API_URL="https://api.yourdomain.com" \
  RELAY_REGION="US-East" \
  RELAY_COUNTRY="US" \
  SOCKS_PORT=1080
```

---

## 2. What the Deployment Script Configures

1. **System Dependencies**: Automatically installs `dante-server`, `curl`, `jq`, and `ufw`.
2. **Dante SOCKS5 Daemon**: Configures high-concurrency SOCKS5 listening on `0.0.0.0:1080` bound to the external interface.
3. **Firewall Rules**: Opens incoming TCP ports `1080` (SOCKS5), `8080` (HTTP), and `50051` (gRPC).
4. **Heartbeat Timer Service**: Installs a systemd timer (`proxy-relay-heartbeat.timer`) that pings the SaaS API every 45 seconds with load metrics, active session counts, and online status.

---

## 3. Verifying Relay Status

Check service status on the VPS:

```bash
# Verify Dante SOCKS5 daemon
systemctl status danted

# Verify Heartbeat timer
systemctl status proxy-relay-heartbeat.timer

# View recent heartbeat execution logs
journalctl -u proxy-relay-heartbeat.service -n 20
```

---

## 4. Viewing Relays in Admin Dashboard

Once registered, all online relay nodes appear automatically in the SaaS API and Admin Dashboard under `/api/v1/relays` and `/api/v1/admin/overview`.
