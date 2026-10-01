import { useState, useEffect, useRef } from 'react';
import { GetEngineStatus, GetActiveProxy, GetProxies, ForceSwitch, Connect, Disconnect, GetRotationStatus } from '../../wailsjs/go/main/App';
import { Power, Globe2, Server, ShieldCheck, RefreshCw, Zap, Info } from 'lucide-react';

export function HomeScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [isManualDisconnect, setIsManualDisconnect] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isForceSwitching, setIsForceSwitching] = useState(false);
  const [activeProxy, setActiveProxy] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  
  // Filters
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [speedRange, setSpeedRange] = useState({ min: 0, max: 0 });
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(0);

  const fetchStatusRef = useRef<() => void>();
  const speedRangeInitialized = useRef(false);

  useEffect(() => {
    fetchStatusRef.current = async () => {
      try {
        const engStatus = await GetEngineStatus();
        setStatus(engStatus);
        
        // Fetch available proxies to build filters
        const proxies = await GetProxies(0, '');
        if (proxies && proxies.length > 0) {
          const countries = Array.from(new Set(proxies.map((p: any) => p.country).filter(Boolean))) as string[];
          setAvailableCountries(countries);
          
          const speeds = proxies.map((p: any) => p.ping || 0).filter((p: number) => p > 0);
          if (speeds.length > 0) {
            const minSpeed = Math.min(...speeds);
            const maxSpeed = Math.max(...speeds);
            // Only set range on first load to prevent slider jumps
            if (!speedRangeInitialized.current) {
              setSpeedRange({ min: minSpeed, max: maxSpeed });
              // Default to a sensible cap (1000ms) instead of maxSpeed which disables the filter
              const defaultCap = Math.min(1000, maxSpeed);
              setSelectedSpeed(defaultCap);
              speedRangeInitialized.current = true;
            }
          }
        } else {
          setAvailableCountries([]);
        }
        
        // Check Rotation Status
        const rotStatus = await GetRotationStatus();
        setRotationEnabled(rotStatus?.enabled || false);
        
        const proxy = await GetActiveProxy();
        setActiveProxy(proxy);
        
        // Only update connected state if not manually disconnected
        if (!isManualDisconnect && !rotStatus?.enabled) {
          if (proxy && proxy.ip) {
            setIsConnected(true);
          } else {
            setIsConnected(false);
          }
        } else if (rotStatus?.enabled) {
          setIsConnected(false);
        }
      } catch (err) {
        console.error(err);
        if (!isManualDisconnect) {
          setIsConnected(false);
        }
      }
    };

    fetchStatusRef.current();
    const interval = setInterval(() => {
      if (fetchStatusRef.current) fetchStatusRef.current();
    }, 3000);
    return () => clearInterval(interval);
  }, [isManualDisconnect]);

  // Explicit filter apply — called on slider release and dropdown change
  const applyFilters = async (country?: string, speed?: number) => {
    if (!isConnected || isConnecting || isForceSwitching) return;
    const c = country !== undefined ? country : selectedCountry;
    const s = speed !== undefined ? speed : selectedSpeed;
    try {
      await Connect(c, s);
      setTimeout(() => {
        if (fetchStatusRef.current) fetchStatusRef.current();
      }, 500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectToggle = async () => {
    if (isConnected || isConnecting) {
      // Disconnect
      setIsConnected(false);
      setIsConnecting(false);
      setIsManualDisconnect(true);
      await Disconnect();
    } else {
      // Connect
      setIsManualDisconnect(false);
      setIsConnecting(true);
      
      await Connect(selectedCountry, selectedSpeed || 0);
      
      setTimeout(() => {
        setIsConnecting(false);
        if (fetchStatusRef.current) fetchStatusRef.current();
      }, 1500);
    }
  };

  const handleForceSurge = async () => {
    if (!isConnected || isForceSwitching) return;
    setIsForceSwitching(true);
    try {
      await ForceSwitch();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      setIsForceSwitching(false);
      if (fetchStatusRef.current) fetchStatusRef.current();
    }, 1500);
  };

  const handleAutoSelect = async () => {
    if (!isConnected || isForceSwitching) return;
    setIsForceSwitching(true);
    setSelectedCountry('');
    try {
      await Connect('', selectedSpeed || 0);
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      setIsForceSwitching(false);
      if (fetchStatusRef.current) fetchStatusRef.current();
    }, 1500);
  };

  return (
    <div className="screen-container" style={{ alignItems: 'center', gap: '16px' }}>
      
      {/* Dynamic Status Header */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <h2 className="heading-2 font-heading" style={{ marginBottom: '6px' }}>
          {rotationEnabled ? 'Surge Active' : isForceSwitching ? 'Force Surge...' : isConnecting ? 'Connecting...' : isConnected ? 'Secure Connection' : 'System Offline'}
        </h2>
        <p className="body text-secondary">
          {rotationEnabled ? 'Surge Rotation is controlling the connection' : (isConnected ? 'Your traffic is securely routed' : 'Tap to connect to the best server')}
        </p>
      </div>

      {rotationEnabled && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '500px' }}>
          <RefreshCw size={24} className="text-blue spin" style={{ color: 'var(--accent-primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="body" style={{ fontWeight: 600 }}>Surge Mode Active</span>
            <span className="caption text-muted">Manual controls and filters are disabled while Surge is rotating proxies.</span>
          </div>
        </div>
      )}

      {/* Main Connect Button */}
      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '4px 0', opacity: rotationEnabled ? 0.5 : 1, pointerEvents: rotationEnabled ? 'none' : 'auto' }}>
        {(isConnecting || isForceSwitching) && <div style={{ animation: 'pulse-ring-blue 2s infinite', width: '100%', height: '100%', borderRadius: '50%', position: 'absolute' }} />}
        {isConnected && !isForceSwitching && <div style={{ animation: 'pulse-ring 3s infinite', width: '100%', height: '100%', borderRadius: '50%', position: 'absolute' }} />}
        
        <button 
          onClick={handleConnectToggle}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: isConnected && !isForceSwitching
              ? 'var(--gradient-connect)' 
              : (isConnecting || isForceSwitching)
                ? 'var(--gradient-primary)'
                : 'var(--bg-panel)',
            boxShadow: isConnected && !isForceSwitching
              ? 'var(--glow-success)' 
              : (isConnecting || isForceSwitching)
                ? 'var(--glow-primary)' 
                : '0 8px 24px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: isConnected || isConnecting || isForceSwitching ? '#fff' : 'var(--text-secondary)',
            transition: 'var(--transition-bounce)',
            zIndex: 10,
            border: (isConnected || isConnecting || isForceSwitching || rotationEnabled) ? 'none' : '1px solid var(--border-active)'
          }}
        >
          <Power size={32} strokeWidth={isConnected || isConnecting || isForceSwitching ? 2.5 : 2} style={{ marginBottom: '4px' }} />
          <span className="heading-3">{rotationEnabled ? 'SURGE' : isConnected ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Proxy Selection Filters */}
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', gap: '12px', opacity: rotationEnabled ? 0.5 : 1, pointerEvents: rotationEnabled ? 'none' : 'auto' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="caption text-muted">Country</span>
          {availableCountries.length > 0 ? (
            <select 
              className="premium-input" 
              style={{ 
                width: '100%', padding: '4px', fontSize: '13px', 
                background: 'rgba(255, 255, 255, 0.05)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border-light)',
                borderRadius: '6px'
              }}
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                applyFilters(e.target.value);
              }}
            >
              <option value="" style={{ background: '#1e1e1e', color: '#fff' }}>Auto (Best Server)</option>
              {availableCountries.map(c => (
                <option key={c} value={c} style={{ background: '#1e1e1e', color: '#fff' }}>{c}</option>
              ))}
            </select>
          ) : (
            <span className="body-small text-secondary">No regions</span>
          )}
        </div>
        <div className="glass-panel" style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="caption text-muted">Max Latency (ms)</span>
          {speedRange.max > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <input 
                type="range" 
                min={speedRange.min} 
                max={speedRange.max} 
                value={selectedSpeed}
                onChange={(e) => setSelectedSpeed(parseInt(e.target.value) || 0)}
                onPointerUp={() => applyFilters()}
                onTouchEnd={() => applyFilters()}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'center' }}>
                <span className="caption text-muted">{speedRange.min}</span>
                <span className="caption" style={{ 
                  color: selectedSpeed <= 500 ? 'var(--accent-success)' : selectedSpeed <= 1500 ? 'var(--accent-primary)' : '#ef4444',
                  fontWeight: 600 
                }}>
                  {selectedSpeed >= speedRange.max ? 'No limit' : `≤${selectedSpeed}ms`}
                </span>
                <span className="caption text-muted">{speedRange.max}</span>
              </div>
            </div>
          ) : (
            <span className="body-small text-secondary">N/A</span>
          )}
        </div>
      </div>

      {/* Active Proxy Card */}
      <div style={{ 
        width: '100%', maxWidth: '500px',
        transition: 'var(--transition-normal)', 
        opacity: isConnected ? 1 : 0.4, 
        transform: isConnected ? 'translateY(0)' : 'translateY(10px)', 
        pointerEvents: isConnected ? 'auto' : 'none' 
      }}>
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex-center" style={{ gap: '10px' }}>
              <Globe2 className="text-blue" size={18} style={{ color: 'var(--accent-primary)' }} />
              <span className="heading-3">{activeProxy?.country || 'Unknown Location'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleAutoSelect}
                disabled={!isConnected || isForceSwitching || rotationEnabled}
                title="Auto Select Best Proxy"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  color: 'var(--text-primary)',
                  cursor: (!isConnected || isForceSwitching || rotationEnabled) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)',
                  opacity: rotationEnabled ? 0.5 : 1
                }}
              >
                <Zap size={12} />
                <span className="caption">Auto</span>
              </button>
              
              <button 
                onClick={handleForceSurge}
                disabled={!isConnected || isForceSwitching || rotationEnabled}
                title="Force Surge"
                style={{
                  background: isForceSwitching ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  color: isForceSwitching ? '#fff' : 'var(--text-primary)',
                  cursor: (!isConnected || isForceSwitching || rotationEnabled) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)',
                  opacity: rotationEnabled ? 0.5 : 1
                }}
              >
                <RefreshCw size={12} className={isForceSwitching ? "spin" : ""} />
                <span className="caption">Surge</span>
              </button>
              
              <div className="flex-center" style={{ gap: '4px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: 'var(--radius-full)', color: 'var(--accent-success)' }}>
                <ShieldCheck size={12} />
              </div>
            </div>
          </div>
          
          <div style={{ height: '1px', background: 'var(--border-light)', width: '100%' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="caption text-muted">IP Address</span>
              <span className="font-mono body-small" style={{ color: 'var(--text-primary)' }}>{activeProxy?.ip || '---.---.---.---'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
              <span className="caption text-muted">Latency</span>
              <span className="font-mono body-small" style={{ color: 'var(--accent-success)' }}>~{activeProxy?.ping ? Math.round(activeProxy.ping) : 45}ms</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
