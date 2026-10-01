import { useState, useEffect } from 'react';
import { Laptop2, Wifi, QrCode, Server } from 'lucide-react';
import { GetLocalIPs, GetConnectedDevices, KickDevice } from '../../wailsjs/go/main/App';

export function DevicesScreen() {
  const [ips, setIps] = useState<string[]>(['127.0.0.1']);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    GetLocalIPs().then(setIps).catch(console.error);
    
    // Poll devices every 2 seconds
    const fetchDevices = () => {
      GetConnectedDevices().then(d => setDevices(d || [])).catch(console.error);
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKick = async (ip: string) => {
    await KickDevice(ip);
    GetConnectedDevices().then(d => setDevices(d || [])).catch(console.error);
  };

  return (
    <div className="screen-container" style={{ gap: '16px', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <Laptop2 size={22} style={{ color: 'var(--text-primary)' }} />
          <h2 className="heading-2 font-heading">Share Connection</h2>
        </div>
        
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '10px', marginBottom: '16px' }}>
            <Wifi size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="heading-3">Local Network (LAN)</h3>
          </div>
          
          <p className="body-small text-muted" style={{ marginBottom: '24px', lineHeight: '1.6' }}>
            Use these addresses to connect other devices on your local network to the encrypted proxy.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'flex-start' }}>
            <span className="text-secondary body">IP Addresses</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              {ips.map(ip => (
                <span key={ip} className="font-mono body text-gradient" style={{ fontWeight: 600 }}>{ip}</span>
              ))}
            </div>
          </div>
          
          <div style={{ height: '1px', background: 'var(--border-light)', width: '100%', marginBottom: '16px' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span className="text-secondary body">SOCKS5</span>
            <span className="font-mono body" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>1080</span>
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)', width: '100%', marginBottom: '16px' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-secondary body">HTTP</span>
            <span className="font-mono body" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>8080</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
          <div className="flex-center" style={{ gap: '10px', marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
            <QrCode size={18} style={{ color: 'var(--accent-success)' }} />
            <h3 className="heading-3">Quick Connect Mobile</h3>
          </div>
          
          <div style={{
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            marginBottom: '16px',
            transition: 'var(--transition-bounce)'
          }}>
            <QrCode size={80} color="#000" strokeWidth={1.5} />
          </div>
          
          <p className="body-small text-muted" style={{ textAlign: 'center', maxWidth: '240px', lineHeight: '1.4' }}>
            Scan the QR code with your mobile camera to automatically configure proxy settings.
          </p>
        </div>

        {/* Connected Devices Section */}
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '10px', marginBottom: '16px' }}>
            <Server size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="heading-3">Connected Devices</h3>
          </div>
          
          {(!devices || devices.length === 0) ? (
            <p className="body-small text-muted" style={{ textAlign: 'center', padding: '10px 0' }}>
              No active devices connected.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {devices.map(dev => (
                <div key={dev.ip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="body" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{dev.ip}</span>
                    <span className="caption text-muted">{dev.active_conns} active connections</span>
                  </div>
                  <button 
                    onClick={() => handleKick(dev.ip)}
                    title="Kick Device"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  >
                    Kick
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
