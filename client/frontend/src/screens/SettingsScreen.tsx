import { useState, useEffect } from 'react';
import { GetSettings, SaveConfig, TestConnection } from '../../wailsjs/go/main/App';
import { Network, Server, ShieldAlert, Sliders, Save, CheckCircle, Loader, Key, Activity, Wifi } from 'lucide-react';

export function SettingsScreen() {
  const [settings, setSettings] = useState<any>({});
  const [engineIP, setEngineIP] = useState('127.0.0.1:50051');
  const [apiKey, setApiKey] = useState('');
  const [socksPort, setSocksPort] = useState(1080);
  const [httpPort, setHttpPort] = useState(8080);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await GetSettings();
      setSettings(s || {});
      if (s.engine_address) setEngineIP(s.engine_address);
      if (s.api_key) setApiKey(s.api_key);
      if (s.socks5_port) setSocksPort(s.socks5_port);
      if (s.http_port) setHttpPort(s.http_port);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await TestConnection(engineIP, apiKey);
      if (res && res.connected) {
        setTestResult({
          success: true,
          message: `Connected & Saved! Mode: ${res.mode || 'self-hosted'}, Alive Proxies: ${res.alive || 0}`
        });
        // Auto-save configuration immediately upon successful test
        await SaveConfig(engineIP, apiKey, socksPort, httpPort);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setTestResult({
          success: false,
          message: 'Connection failed: Server responded with error'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Connection failed: Unable to reach engine'
      });
    }
    setIsTesting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await SaveConfig(engineIP, apiKey, socksPort, httpPort);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  return (
    <div className="screen-container" style={{ gap: '16px', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="flex-center" style={{ gap: '12px' }}>
            <Sliders size={22} style={{ color: 'var(--text-primary)' }} />
            <h2 className="heading-2 font-heading">Settings</h2>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{
              background: saveSuccess ? 'var(--accent-success)' : 'var(--accent-primary)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-full)',
              padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'var(--transition-fast)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {saveSuccess ? <CheckCircle size={14} /> : isSaving ? <Loader size={14} className="spin" /> : <Save size={14} />}
            <span className="caption" style={{ fontWeight: 600 }}>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}</span>
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
            <div className="flex-center" style={{ gap: '10px' }}>
              <Server size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 className="heading-3">Remote Engine Server</h3>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !engineIP}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
              }}
            >
              {isTesting ? <Loader size={12} className="spin" /> : <Wifi size={12} />}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {testResult && (
            <div 
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '12px',
                background: testResult.success ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                color: testResult.success ? '#2ed573' : '#ff4757',
                border: `1px solid ${testResult.success ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Activity size={14} />
              <span>{testResult.message}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="caption text-muted">Engine Server Host:Port</span>
              <input 
                type="text" 
                value={engineIP}
                onChange={(e) => setEngineIP(e.target.value)}
                className="premium-input"
                placeholder="127.0.0.1:50051 or vps.domain.com:50051"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="caption text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Key size={12} /> Engine API Key (pk_live_...)
              </span>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="premium-input"
                placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '10px', marginBottom: '20px' }}>
            <Network size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="heading-3">Local Proxy Ports</h3>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="body">SOCKS5 Port</span>
            <input 
              type="number" 
              value={socksPort}
              onChange={(e) => setSocksPort(parseInt(e.target.value) || 1080)}
              className="premium-input"
              style={{ width: '80px', textAlign: 'center' }}
            />
          </div>
          
          <div style={{ height: '1px', background: 'var(--border-light)', width: '100%', marginBottom: '16px' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="body">HTTP Port</span>
            <input 
              type="number" 
              value={httpPort}
              onChange={(e) => setHttpPort(parseInt(e.target.value) || 8080)}
              className="premium-input"
              style={{ width: '80px', textAlign: 'center' }}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
