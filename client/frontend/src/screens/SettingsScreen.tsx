import { useState, useEffect } from 'react';
import { GetSettings, SaveConfig } from '../../wailsjs/go/main/App';
import { Network, Server, ShieldAlert, Sliders, Save, CheckCircle, Loader } from 'lucide-react';

export function SettingsScreen() {
  const [settings, setSettings] = useState<any>({});
  const [engineIP, setEngineIP] = useState('127.0.0.1:50051');
  const [socksPort, setSocksPort] = useState(1080);
  const [httpPort, setHttpPort] = useState(8080);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await GetSettings();
      setSettings(s || {});
      if (s.engine_address) setEngineIP(s.engine_address);
      if (s.socks5_port) setSocksPort(s.socks5_port);
      if (s.http_port) setHttpPort(s.http_port);
      if (s.auth_username) setToken(s.auth_username);
      if (s.auth_password) setPassword(s.auth_password);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await SaveConfig(engineIP, socksPort, httpPort, token, password);
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
            <span className="caption" style={{ fontWeight: 600 }}>{isSaving ? 'Reconnecting...' : saveSuccess ? 'Connected!' : 'Save'}</span>
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '10px', marginBottom: '20px' }}>
            <Server size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="heading-3">Engine Server</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="caption text-muted">Server Address (IP:Port)</span>
              <input 
                type="text" 
                value={engineIP}
                onChange={(e) => setEngineIP(e.target.value)}
                className="premium-input"
                placeholder="127.0.0.1:50051"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="caption text-muted">Password</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="premium-input"
                placeholder="Optional"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="caption text-muted">Username</span>
              <input 
                type="text" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="premium-input"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '10px', marginBottom: '20px' }}>
            <Network size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="heading-3">Local Ports</h3>
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
