#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Proxy Redirector — Automated Multi-Region VPS Relay Deployer
# Supported OS: Ubuntu 20.04 / 22.04 / 24.04 LTS, Debian 11 / 12
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration Defaults (can be overridden via environment variables)
SAAS_API_URL="${SAAS_API_URL:-http://localhost:4000}"
RELAY_REGION="${RELAY_REGION:-US-East}"
RELAY_COUNTRY="${RELAY_COUNTRY:-US}"
SOCKS_PORT="${SOCKS_PORT:-1080}"
HTTP_PORT="${HTTP_PORT:-8080}"
GRPC_PORT="${GRPC_PORT:-50051}"

echo "================================================================"
echo " 🚀 Deploying Proxy Redirector Relay Node ($RELAY_REGION)"
echo "================================================================"

# 1. Root verification
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# 2. Detect Public IP Address
PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me || hostname -I | awk '{print $1}')
echo "📍 Public IP detected: $PUBLIC_IP"

# 3. Update packages and install dependencies
echo "📦 Installing system dependencies (dante-server, curl, ufw)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq dante-server curl ufw jq

# 4. Configure Dante SOCKS5 Server
echo "⚙️ Configuring Dante SOCKS5 daemon on port $SOCKS_PORT..."
ETH_INTERFACE=$(ip route get 8.8.8.8 | awk '{print $5; exit}')

cat <<EOF > /etc/danted.conf
logoutput: syslog
internal: 0.0.0.0 port = $SOCKS_PORT
external: $ETH_INTERFACE
socksmethod: none
clientmethod: none

user.privileged: root
user.unprivileged: nobody

client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: error
}

socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    command: bind connect udpassociate
    log: error
}
EOF

# 5. Restart and enable Dante service
systemctl restart danted
systemctl enable danted
echo "✅ Dante SOCKS5 daemon is running on port $SOCKS_PORT."

# 6. Configure UFW Firewall
echo "🛡️ Configuring firewall rules..."
ufw allow "$SOCKS_PORT"/tcp comment "Proxy Redirector SOCKS5" >/dev/null || true
ufw allow "$HTTP_PORT"/tcp comment "Proxy Redirector HTTP" >/dev/null || true
ufw allow "$GRPC_PORT"/tcp comment "Proxy Redirector gRPC" >/dev/null || true

# 7. Initial Registration & Heartbeat to SaaS API
echo "🔗 Registering relay node with Central SaaS API ($SAAS_API_URL)..."
REG_PAYLOAD=$(cat <<EOF
{
  "publicIp": "$PUBLIC_IP",
  "region": "$RELAY_REGION",
  "country": "$RELAY_COUNTRY",
  "currentLoad": 0.0,
  "activeSessions": 0,
  "status": "ONLINE"
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/reg_resp.json -w "%{http_code}" \
  -X POST "$SAAS_API_URL/api/v1/relays/heartbeat" \
  -H "Content-Type: application/json" \
  -d "$REG_PAYLOAD" || echo "000")

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
    echo "✅ Relay successfully registered with Central SaaS!"
else
    echo "⚠️ Notice: SaaS heartbeat returned HTTP $HTTP_CODE (will retry automatically via background service)."
fi

# 8. Create Background Periodic Heartbeat Service
echo "⏱️ Setting up periodic heartbeat systemd timer..."
cat <<EOF > /usr/local/bin/proxy-relay-heartbeat.sh
#!/bin/bash
PAYLOAD='{"publicIp":"$PUBLIC_IP","region":"$RELAY_REGION","country":"$RELAY_COUNTRY","currentLoad":0.0,"activeSessions":0,"status":"ONLINE"}'
curl -s -X POST "$SAAS_API_URL/api/v1/relays/heartbeat" -H "Content-Type: application/json" -d "\$PAYLOAD" >/dev/null 2>&1 || true
EOF

chmod +x /usr/local/bin/proxy-relay-heartbeat.sh

# Heartbeat systemd service
cat <<EOF > /etc/systemd/system/proxy-relay-heartbeat.service
[Unit]
Description=Proxy Redirector Relay Heartbeat

[Service]
Type=oneshot
ExecStart=/usr/local/bin/proxy-relay-heartbeat.sh
EOF

# Heartbeat systemd timer (every 45 seconds)
cat <<EOF > /etc/systemd/system/proxy-relay-heartbeat.timer
[Unit]
Description=Run Proxy Redirector Relay Heartbeat every 45 seconds

[Timer]
OnBootSec=10sec
OnUnitActiveSec=45sec

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now proxy-relay-heartbeat.timer

echo "================================================================"
echo " 🎉 Relay Node Deployment Complete!"
echo "    Node Public IP: $PUBLIC_IP"
echo "    Region:         $RELAY_REGION ($RELAY_COUNTRY)"
echo "    SOCKS5 Port:    $SOCKS_PORT"
echo "    Central SaaS:   $SAAS_API_URL"
echo "================================================================"
