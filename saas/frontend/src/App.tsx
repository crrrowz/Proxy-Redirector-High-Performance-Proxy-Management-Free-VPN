import React, { useState } from 'react';

export function App() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [msg, setMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    const endpoint = authModal === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const body = authModal === 'register' ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setAuthModal(null);
        setMsg(`Welcome ${data.data.user.email}!`);
      } else {
        setMsg(`❌ ${data.error?.message || 'Authentication failed'}`);
      }
    } catch {
      setMsg('❌ Could not connect to SaaS API server.');
    }
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container nav-container">
          <a href="#" className="brand">
            <div className="brand-icon">⚡</div>
            <span>Proxy Redirector Cloud</span>
          </a>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#mesh" className="nav-link">Relay Mesh</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#downloads" className="nav-link">Downloads</a>
            {user ? (
              <span style={{ fontSize: '13px', color: 'var(--cyan)' }}>👤 {user.email}</span>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => setAuthModal('login')}>Sign In</button>
                <button className="btn btn-primary" onClick={() => setAuthModal('register')}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <span>✨ Version 3.0 Platform Live</span>
          </div>
          <h1 className="hero-title">
            Enterprise Cloud Proxy & <span>Zero-Leak Free VPN</span>
          </h1>
          <p className="hero-subtitle">
            High-speed SOCKS5 and HTTP routing with sub-second failovers, dedicated static residential IPs, dynamic Surge rotation, and native AdBlock security.
          </p>
          <div className="hero-cta">
            <a href="#downloads" className="btn btn-primary">⬇️ Download Desktop App</a>
            <a href="#pricing" className="btn btn-secondary">View Cloud Plans</a>
          </div>
        </div>
      </section>

      {/* Static Relay Mesh Grid */}
      <section id="mesh" className="container">
        <h2 className="section-title">🌍 Global Dedicated Static Mesh</h2>
        <p className="section-subtitle">Ultra-low latency carrier-grade static nodes with guaranteed IP stickiness</p>

        <div className="mesh-grid">
          <div className="node-card">
            <div className="node-info">
              <h4>🇺🇸 US-East Relay Node</h4>
              <div className="node-meta">New York • AT&T ISP • Ping: 24ms</div>
            </div>
            <span className="status-badge">99.99% Online</span>
          </div>

          <div className="node-card">
            <div className="node-info">
              <h4>🇩🇪 EU-Central Relay Node</h4>
              <div className="node-meta">Frankfurt • Deutsche Telekom • Ping: 18ms</div>
            </div>
            <span className="status-badge">100.0% Online</span>
          </div>

          <div className="node-card">
            <div className="node-info">
              <h4>🇸🇬 Asia-Pacific Relay Node</h4>
              <div className="node-meta">Singapore • StarHub ISP • Ping: 32ms</div>
            </div>
            <span className="status-badge">99.98% Online</span>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container">
        <h2 className="section-title">Transparent Tier Plans</h2>
        <p className="section-subtitle">Scalable bandwidth, dedicated static IPs, and multi-device support</p>

        <div className="pricing-grid">
          <div className="plan-card">
            <div className="plan-name">Community Free</div>
            <div className="plan-price">$0 <span>/ month</span></div>
            <ul className="plan-features">
              <li className="plan-feature-item">✓ 1 GB Monthly Cloud Bandwidth</li>
              <li className="plan-feature-item">✓ 1 Connected Device</li>
              <li className="plan-feature-item">✓ SOCKS5 & HTTP Proxy Relay</li>
              <li className="plan-feature-item">✓ Built-in DNS AdBlocker</li>
            </ul>
            <button className="btn btn-secondary" onClick={() => setAuthModal('register')}>Start Free</button>
          </div>

          <div className="plan-card featured">
            <div className="plan-name">Pro Static & Surge</div>
            <div className="plan-price">$12 <span>/ month</span></div>
            <ul className="plan-features">
              <li className="plan-feature-item">✓ 200 GB Monthly Bandwidth</li>
              <li className="plan-feature-item">✓ 5 Simultaneous Devices</li>
              <li className="plan-feature-item">✓ Dedicated Leased Static IPs</li>
              <li className="plan-feature-item">✓ Surge Dynamic Rotation Mode</li>
              <li className="plan-feature-item">✓ Global Multi-Region Access</li>
            </ul>
            <button className="btn btn-primary" onClick={() => setAuthModal('register')}>Upgrade to Pro</button>
          </div>

          <div className="plan-card">
            <div className="plan-name">Enterprise Fleet</div>
            <div className="plan-price">$30 <span>/ month</span></div>
            <ul className="plan-features">
              <li className="plan-feature-item">✓ 1 TB Monthly Bandwidth</li>
              <li className="plan-feature-item">✓ 15 Simultaneous Devices</li>
              <li className="plan-feature-item">✓ Private Isolated VPS Relay Nodes</li>
              <li className="plan-feature-item">✓ 99.9% Hardware SLA</li>
              <li className="plan-feature-item">✓ Dedicated REST & gRPC API Key</li>
            </ul>
            <button className="btn btn-secondary" onClick={() => setAuthModal('register')}>Contact Sales</button>
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="container" style={{ textAlign: 'center', paddingBottom: '80px' }}>
        <h2 className="section-title">Download Client Apps</h2>
        <p className="section-subtitle">Native applications with zero configuration required</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div className="plan-card" style={{ width: '320px', textAlign: 'center' }}>
            <h3>🪟 Windows Desktop App</h3>
            <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px 0', fontSize: '13px' }}>
              Wails GUI native dark-theme desktop application with system tray.
            </p>
            <button className="btn btn-primary" onClick={() => alert('Downloading ProxyRedirector-Setup-v3.0.0.exe')}>
              Download .exe (64-bit)
            </button>
          </div>

          <div className="plan-card" style={{ width: '320px', textAlign: 'center' }}>
            <h3>🐧 Linux & CLI Daemon</h3>
            <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px 0', fontSize: '13px' }}>
              Headless standalone <code>proxy-cli</code> for servers and automated pipelines.
            </p>
            <button className="btn btn-secondary" onClick={() => alert('Downloading proxy-cli-linux-amd64')}>
              Download CLI Binary
            </button>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {authModal && (
        <div className="modal-overlay" onClick={() => setAuthModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                {authModal === 'register' ? '🚀 Create Free Account' : '🔐 Sign In to Proxy Redirector'}
              </h3>
              <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }} onClick={() => setAuthModal(null)}>
                &times;
              </button>
            </div>

            {msg && <div style={{ marginBottom: '16px', fontSize: '13px', color: msg.startsWith('❌') ? '#f87171' : '#34d399' }}>{msg}</div>}

            <form onSubmit={handleAuth}>
              {authModal === 'register' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAuthModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{authModal === 'register' ? 'Register' : 'Sign In'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
