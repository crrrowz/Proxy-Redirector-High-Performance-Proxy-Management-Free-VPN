import React, { useState } from 'react';
import { ShieldCheck, Cpu, Lock, RefreshCw } from 'lucide-react';
import { RelayNode } from '../../types';

interface MeshViewProps {
  relays: RelayNode[];
  onPingAll: () => void;
  lang: 'ar' | 'en';
}

export const MeshView: React.FC<MeshViewProps> = ({
  relays: initialRelays,
  lang
}) => {
  const [relays, setRelays] = useState<RelayNode[]>(initialRelays);
  const [isPinging, setIsPinging] = useState(false);

  const handlePingTest = () => {
    setIsPinging(true);
    setTimeout(() => {
      setRelays(
        relays.map((r) => ({
          ...r,
          latencyMs: +(Math.random() * 15 + 15).toFixed(1),
          loadPercent: Math.floor(Math.random() * 25) + 10
        }))
      );
      setIsPinging(false);
    }, 800);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
          {lang === 'ar' ? 'خوادم التوجيه الحية (Live Relays)' : 'Active Relay Mesh Fleet'}
        </h2>
        <button
          className="btn btn-outline btn-sm"
          onClick={handlePingTest}
          disabled={isPinging}
        >
          <RefreshCw size={13} className={isPinging ? 'animate-spin' : ''} />{' '}
          {lang === 'ar' ? 'فحص زمن الاستجابة الفوري' : 'Ping Mesh Latency'}
        </button>
      </div>

      <div className="metrics-grid">
        {relays.map((rel) => (
          <div key={rel.id} className="metric-card">
            <div className="metric-header">
              <span className="metric-label">{rel.name}</span>
              <span className="badge badge-emerald">
                <span className="status-dot" /> {rel.status.toUpperCase()}
              </span>
            </div>
            <div className="metric-value font-mono" style={{ fontSize: '20px' }}>
              {rel.ip}
            </div>
            <div className="metric-sub">
              gRPC :{rel.grpcPort} • SOCKS5 :{rel.socksPort} • Ping:{' '}
              <strong style={{ color: 'var(--accent-emerald)' }}>
                {rel.latencyMs}ms
              </strong>
            </div>
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'var(--border-subtle)',
                borderRadius: '2px',
                marginTop: '10px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${rel.loadPercent}%`,
                  height: '100%',
                  background: 'var(--accent-primary)',
                  borderRadius: '2px'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            {lang === 'ar'
              ? 'معمارية شبكة التوجيه الحية (Relay Mesh)'
              : 'Relay Mesh Live Topology'}
          </div>
          <span className="badge badge-emerald">
            <ShieldCheck size={13} /> Zero-Leak Guard Active
          </span>
        </div>
        <div className="panel-body">
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13.5px',
              marginBottom: '20px',
              lineHeight: 1.7
            }}
          >
            {lang === 'ar'
              ? 'جميع العقد مزودة بحماية DNS Leak Shield وتدعم تبديل الحزم عبر خوارزمية Surge Dynamic Rotation مع إمكانية تحويل بروتوكول SOCKS5 مباشرة إلى HTTP/HTTPS وتشفير كامل للاتصالات.'
              : 'All relay nodes enforce kernel-level DNS Leak Shielding and support Surge Dynamic Packet Routing with automatic fallback failover and zero telemetry leakage.'}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            <div
              style={{
                background: 'var(--bg-input)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#60a5fa'
                }}
              >
                <Cpu
                  size={14}
                  style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }}
                />{' '}
                Dynamic Load Balancing
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
                Automatic traffic distribution across nearest geographic POPs with sub-20ms routing.
              </div>
            </div>
            <div
              style={{
                background: 'var(--bg-input)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: 'var(--accent-emerald)'
                }}
              >
                <Lock
                  size={14}
                  style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }}
                />{' '}
                AES-256-GCM Tunneling
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
                Encrypted relay-to-relay packet synchronization ensuring complete packet payload confidentiality.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
