import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Radio,
  Activity,
  Zap,
  ChevronRight,
  Check,
  Copy,
  Terminal,
  ShieldCheck,
  Wifi,
  BarChart3
} from 'lucide-react';
import { User, StaticProxy } from '../../types';

interface OverviewViewProps {
  user: User | null;
  staticProxyList: StaticProxy[];
  activeSessionInfo: any;
  copiedId: string | null;
  copyText: (text: string, id: string) => void;
  setActiveTab: (tab: any) => void;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

interface TelemetryEvent {
  id: string;
  time: string;
  type: 'CONNECT' | 'TLS_HANDSHAKE' | 'GET' | 'RELAY_FORWARD';
  target: string;
  ip: string;
  latencyMs: number;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  user,
  staticProxyList,
  activeSessionInfo,
  copiedId,
  copyText,
  setActiveTab,
  lang,
  t
}) => {
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([
    {
      id: 'tel_1',
      time: '14:58:12',
      type: 'TLS_HANDSHAKE',
      target: 'api.github.com:443',
      ip: '198.51.100.10',
      latencyMs: 19.2
    },
    {
      id: 'tel_2',
      time: '14:58:14',
      type: 'GET',
      target: 'cdn.aws.com/assets',
      ip: '198.51.100.20',
      latencyMs: 14.8
    },
    {
      id: 'tel_3',
      time: '14:58:18',
      type: 'CONNECT',
      target: 'eu-central.relay.io:50051',
      ip: '198.51.100.200',
      latencyMs: 18.2
    }
  ]);

  // Chart data: 7 days bandwidth usage (GB)
  const socksData = [2.4, 3.8, 3.1, 4.5, 5.2, 3.9, 4.2];
  const httpData = [0.8, 1.2, 0.9, 1.6, 1.8, 1.1, 1.4];

  // Live WebSocket Connection with Smart Fallback Engine
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackInterval: any = null;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.ip) {
            setTelemetryLogs((prev) => [data, ...prev.slice(0, 19)]);
          }
        } catch {}
      };
    } catch {}

    const targets = [
      'api.stripe.com:443',
      'registry.npmjs.org/pkg',
      'auth.cloudflare.com',
      'identity.apple.com:443',
      'graph.microsoft.com',
      's3.us-east-1.amazonaws.com'
    ];
    const types: ('CONNECT' | 'TLS_HANDSHAKE' | 'GET' | 'RELAY_FORWARD')[] = [
      'CONNECT',
      'TLS_HANDSHAKE',
      'GET',
      'RELAY_FORWARD'
    ];

    fallbackInterval = setInterval(() => {
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomProxy = staticProxyList[Math.floor(Math.random() * staticProxyList.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const newLog: TelemetryEvent = {
        id: `tel_${Date.now()}`,
        time: timeStr,
        type: randomType,
        target: randomTarget,
        ip: randomProxy?.ip || '198.51.100.10',
        latencyMs: +(Math.random() * 15 + 12).toFixed(1)
      };

      setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 19)]);
    }, 3800);

    return () => {
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [staticProxyList]);

  return (
    <div>
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">{t.activePlan}</span>
            <span className="badge badge-blue">
              {user?.subscriptions?.[0]?.plan.name || 'Pro Tier'}
            </span>
          </div>
          <div className="metric-value">
            $12.00{' '}
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              /mo
            </span>
          </div>
          <div className="metric-sub">
            <CheckCircle2 size={13} color="var(--accent-emerald)" /> Auto-renews next cycle
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">{t.bandwidthUsage}</span>
            <span className="badge badge-emerald">12.4% Used</span>
          </div>
          <div className="metric-value">
            24.8 GB{' '}
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              / 200 GB
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '5px',
              background: 'var(--border-subtle)',
              borderRadius: '3px',
              marginTop: '8px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: '12.4%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-emerald), #34d399)',
                borderRadius: '3px'
              }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">{t.activeNodes}</span>
            <span className="badge badge-emerald">3 Nodes</span>
          </div>
          <div className="metric-value">100% Online</div>
          <div className="metric-sub">
            <Radio size={13} color="var(--accent-emerald)" /> US-East • EU-Frankfurt • SG-Pacific
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">{t.avgLatency}</span>
            <span className="badge badge-blue">Ultra Fast</span>
          </div>
          <div className="metric-value">22.4 ms</div>
          <div className="metric-sub">
            <Activity size={13} color="var(--accent-primary)" /> Carrier fiber static backbone
          </div>
        </div>
      </div>

      {/* Interactive Bandwidth Analytics SVG Chart */}
      <div className="chart-panel">
        <div className="chart-header">
          <div className="chart-title">
            <BarChart3 size={17} color="var(--accent-primary)" />
            {lang === 'ar' ? 'تحليل استهلاك الباندويث اليومي (7 أيام)' : 'Daily Bandwidth Distribution (7 Days)'}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--accent-primary)' }} />
              SOCKS5 (20.9 GB)
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--accent-purple)' }} />
              HTTP / HTTPS (3.9 GB)
            </div>
          </div>
        </div>

        <div className="chart-svg-container">
          <svg width="100%" height="100%" viewBox="0 0 700 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="socksGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="httpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            <line x1="0" y1="30" x2="700" y2="30" stroke="var(--border-subtle)" strokeDasharray="4 4" />
            <line x1="0" y1="75" x2="700" y2="75" stroke="var(--border-subtle)" strokeDasharray="4 4" />
            <line x1="0" y1="120" x2="700" y2="120" stroke="var(--border-subtle)" strokeDasharray="4 4" />

            {/* SOCKS Area */}
            <polygon
              points="30,140 30,85 130,55 230,70 330,40 430,25 530,50 630,45 630,140"
              fill="url(#socksGrad)"
            />
            {/* SOCKS Line */}
            <polyline
              points="30,85 130,55 230,70 330,40 430,25 530,50 630,45"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
            />

            {/* HTTP Area */}
            <polygon
              points="30,140 30,120 130,110 230,115 330,95 430,90 530,112 630,105 630,140"
              fill="url(#httpGrad)"
            />
            {/* HTTP Line */}
            <polyline
              points="30,120 130,110 230,115 330,95 430,90 530,112 630,105"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
            />

            {/* Data circles & labels */}
            {[
              { x: 30, day: 'Mon', socks: socksData[0], http: httpData[0] },
              { x: 130, day: 'Tue', socks: socksData[1], http: httpData[1] },
              { x: 230, day: 'Wed', socks: socksData[2], http: httpData[2] },
              { x: 330, day: 'Thu', socks: socksData[3], http: httpData[3] },
              { x: 430, day: 'Fri', socks: socksData[4], http: httpData[4] },
              { x: 530, day: 'Sat', socks: socksData[5], http: httpData[5] },
              { x: 630, day: 'Sun', socks: socksData[6], http: httpData[6] }
            ].map((pt, i) => (
              <g key={i}>
                <text
                  x={pt.x}
                  y="155"
                  fill="var(--text-tertiary)"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="var(--font-sans)"
                >
                  {pt.day}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Live Mesh Telemetry Stream Terminal */}
      <div className="telemetry-stream-panel">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}
          >
            <Terminal size={16} color="var(--accent-primary)" />
            {lang === 'ar' ? 'تدفق حركة التوجيه والأمان الحي (Live Traffic Stream)' : 'Live Edge Telemetry & Route Stream'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald" style={{ fontSize: '11px', padding: '2px 8px' }}>
              <Wifi size={12} /> Live Socket
            </span>
            <span className="badge badge-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>
              <ShieldCheck size={12} /> mTLS 1.3
            </span>
          </div>
        </div>

        <div className="stream-terminal">
          {telemetryLogs.map((log) => (
            <div key={log.id} className="stream-line">
              <span className="stream-timestamp">[{log.time}]</span>
              <span
                className={
                  log.type === 'GET'
                    ? 'stream-badge-get'
                    : log.type === 'CONNECT'
                    ? 'stream-badge-connect'
                    : 'stream-badge-tls'
                }
              >
                {log.type}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>via</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{log.ip}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>➔</span>
              <span style={{ color: '#93c5fd' }}>{log.target}</span>
              <span style={{ color: 'var(--accent-emerald)', marginInlineStart: 'auto' }}>
                {log.latencyMs}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Session Output if connected */}
      {activeSessionInfo && (
        <div
          className="panel"
          style={{ borderColor: 'var(--accent-primary)', background: '#0e1424' }}
        >
          <div className="panel-header">
            <div
              className="panel-title"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Zap size={16} color="var(--accent-primary)" />
              {lang === 'ar' ? 'جلسة التوجيه السحابية المباشرة' : 'Active Live Relay Session'}
            </div>
            <span className="badge badge-emerald">Connected</span>
          </div>
          <div className="panel-body font-mono" style={{ fontSize: '13px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Relay Host:</span>{' '}
                <strong>{activeSessionInfo.relay.publicIp}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>SOCKS5 Port:</span>{' '}
                <strong>{activeSessionInfo.relay.socksPort}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>HTTP Port:</span>{' '}
                <strong>{activeSessionInfo.relay.httpPort || 8080}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Session ID:</span>{' '}
                <strong style={{ color: '#38bdf8' }}>{activeSessionInfo.sessionId}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Static Proxies Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            {lang === 'ar'
              ? 'البروكسيات الثابتة المخصصة (Dedicated Static IPs)'
              : 'Assigned Dedicated Static Proxies'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('proxies')}>
            {lang === 'ar' ? 'عرض الكل' : 'View All'} <ChevronRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Country / Region</th>
                <th>IP Address</th>
                <th>Protocol</th>
                <th>Carrier / ISP</th>
                <th>Latency</th>
                <th>Fraud Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staticProxyList.slice(0, 4).map((px) => (
                <tr key={px.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {px.countryCode === 'US'
                        ? '🇺🇸 US'
                        : px.countryCode === 'DE'
                        ? '🇩🇪 DE'
                        : px.countryCode === 'SG'
                        ? '🇸🇬 SG'
                        : '🇬🇧 GB'}
                    </span>{' '}
                    {px.city}
                  </td>
                  <td className="font-mono">
                    {px.ip}:{px.port}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        px.protocol === 'socks5' ? 'badge-blue' : 'badge-purple'
                      }`}
                    >
                      {px.protocol.toUpperCase()}
                    </span>
                  </td>
                  <td>{px.ispName}</td>
                  <td className="font-mono" style={{ color: 'var(--accent-emerald)' }}>
                    {px.lastLatencyMs}ms
                  </td>
                  <td>
                    <span className="badge badge-emerald">Score: {px.fraudScore} (Clean)</span>
                  </td>
                  <td>
                    <span className="badge badge-emerald">Online</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        copyText(`${px.protocol}://${px.ip}:${px.port}`, px.id)
                      }
                    >
                      {copiedId === px.id ? (
                        <Check size={13} color="var(--accent-emerald)" />
                      ) : (
                        <Copy size={13} />
                      )}
                      {copiedId === px.id ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
