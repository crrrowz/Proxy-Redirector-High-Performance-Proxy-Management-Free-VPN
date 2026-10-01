import { useState } from 'react';

type RotationFiltersProps = {
  disabled: boolean;
  types: string[];
  setTypes: (t: string[]) => void;
  country: string;
  setCountry: (c: string) => void;
  maxSpeed: number;
  setMaxSpeed: (s: number) => void;
  sslOnly: boolean;
  setSslOnly: (s: boolean) => void;
  poolSize: number;
  setPoolSize: (s: number) => void;
  interval: number;
  setInterval: (s: number) => void;
  availableCountries: string[];
  maxPossibleSpeed: number;
};

export function RotationFilters({
  disabled, types, setTypes, country, setCountry, maxSpeed, setMaxSpeed,
  sslOnly, setSslOnly, poolSize, setPoolSize, interval, setInterval,
  availableCountries, maxPossibleSpeed
}: RotationFiltersProps) {

  const toggleType = (t: string) => {
    if (t === 'all') {
      setTypes(['all']);
      return;
    }
    
    let newTypes = types.filter(x => x !== 'all');
    if (newTypes.includes(t)) {
      newTypes = newTypes.filter(x => x !== t);
    } else {
      newTypes.push(t);
    }
    if (newTypes.length === 0) newTypes = ['all'];
    setTypes(newTypes);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
      <h3 className="heading-3">Filters & Rules</h3>
      
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {['all', 'http', 'socks4', 'socks5'].map(t => (
          <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', border: types.includes(t) ? '1px solid var(--accent-primary)' : '1px solid transparent', transition: 'all 0.2s' }}>
            <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} style={{ display: 'none' }} />
            <span className="caption" style={{ textTransform: 'uppercase', color: types.includes(t) ? 'var(--accent-primary)' : 'inherit', fontWeight: types.includes(t) ? 600 : 400 }}>{t}</span>
          </label>
        ))}
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', border: sslOnly ? '1px solid var(--accent-success)' : '1px solid transparent', transition: 'all 0.2s' }}>
          <input type="checkbox" checked={sslOnly} onChange={(e) => setSslOnly(e.target.checked)} style={{ display: 'none' }} />
          <span className="caption" style={{ color: sslOnly ? 'var(--accent-success)' : 'inherit', fontWeight: sslOnly ? 600 : 400 }}>SSL Only</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <span className="caption text-muted">Target Location</span>
          <select className="premium-input" value={country} onChange={e => setCountry(e.target.value)} style={{ width: '100%' }}>
            <option value="">Global (Any)</option>
            {availableCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <span className="caption text-muted">Max Latency: {maxSpeed > 0 ? `≤${maxSpeed}ms` : 'No Limit'}</span>
          <input type="range" min="0" max={maxPossibleSpeed > 0 ? maxPossibleSpeed : 2000} step="50" value={maxSpeed} onChange={e => setMaxSpeed(Number(e.target.value))} style={{ width: '100%', marginTop: '6px' }} />
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0' }}></div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <span className="caption text-muted">Pool Size (0 = Unlimited)</span>
          <input type="number" className="premium-input" min="0" value={poolSize} onChange={e => setPoolSize(Number(e.target.value))} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <span className="caption text-muted">Rotation Interval (sec)</span>
          <input type="number" className="premium-input" min="5" value={interval} onChange={e => setInterval(Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}
