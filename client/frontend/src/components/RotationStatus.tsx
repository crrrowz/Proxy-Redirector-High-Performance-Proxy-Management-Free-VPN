import { RefreshCw, Server, Globe } from 'lucide-react';

type RotationStatusProps = {
  enabled: boolean;
  poolSize: number;
  filteredCount: number;
  currentIndex: number;
  activeIp: string;
  activePort: number;
  activeType: string;
};

export function RotationStatusView({ enabled, poolSize, filteredCount, currentIndex, activeIp, activePort, activeType }: RotationStatusProps) {
  if (!enabled) {
    return (
      <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
        <RefreshCw size={32} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <h3 className="heading-3">Surge Rotation is Disabled</h3>
        <p className="caption text-muted" style={{ marginTop: '8px' }}>Turn on Surge to automatically rotate through proxies based on your rules.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background glow effect */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--accent-primary)', opacity: 0.1, filter: 'blur(50px)', borderRadius: '50%' }}></div>
      
      <div className="flex-center" style={{ justifyContent: 'space-between' }}>
        <div className="flex-center" style={{ gap: '8px' }}>
          <RefreshCw size={18} className="spin text-blue" style={{ color: 'var(--accent-primary)' }} />
          <h3 className="heading-3">Rotation Active</h3>
        </div>
        <span className="caption" style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
          {poolSize > 0 ? `${currentIndex + 1} / ${poolSize}` : '---'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="caption text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Server size={12} /> Current Proxy</span>
          <span className="font-mono body text-gradient" style={{ fontWeight: 600, fontSize: '18px' }}>{activeIp ? `${activeIp}:${activePort}` : 'Loading...'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span className="caption text-muted">Protocol</span>
          <span className="caption" style={{ textTransform: 'uppercase', color: 'var(--accent-success)', fontWeight: 600, background: 'rgba(0,255,100,0.1)', padding: '2px 8px', borderRadius: '8px' }}>
            {activeType || '---'}
          </span>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-light)' }}></div>

      <div className="flex-center" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={14} className="text-muted" />
          <span className="caption text-muted">Total Matches: <strong style={{ color: 'var(--text-primary)' }}>{filteredCount}</strong></span>
        </div>
        <span className="caption text-muted">Active Pool Size: <strong style={{ color: 'var(--text-primary)' }}>{poolSize}</strong></span>
      </div>
    </div>
  );
}
