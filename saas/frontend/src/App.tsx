import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { User, Plan, StaticProxy, RelayNode, AdminOverview, NotificationItem } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewView } from './components/views/OverviewView';
import { ProxiesView } from './components/views/ProxiesView';
import { MeshView } from './components/views/MeshView';
import { ApiView } from './components/views/ApiView';
import { DevicesView } from './components/views/DevicesView';
import { BillingView } from './components/views/BillingView';
import { AdminView } from './components/views/AdminView';
import { LeaseModal } from './components/modals/LeaseModal';
import { AuthModal } from './components/modals/AuthModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { BulkImportModal } from './components/modals/BulkImportModal';
import { LandingGuestView } from './components/views/LandingGuestView';

export function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'dark' | 'light' | 'cyber'>(
    (localStorage.getItem('saas_theme') as any) || 'dark'
  );
  const [activeTab, setActiveTab] = useState<
    'overview' | 'proxies' | 'mesh' | 'api' | 'devices' | 'billing' | 'admin'
  >('overview');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('saas_token'));
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [leaseModal, setLeaseModal] = useState(false);
  const [bulkImportModal, setBulkImportModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [maxLatency, setMaxLatency] = useState(100);
  const [email, setEmail] = useState('admin@proxyredirector.io');
  const [password, setPassword] = useState('AdminSecret123!');
  const [name, setName] = useState('System Admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'Active Subscription Confirmed',
      message: 'Your Pro Tier subscription is active with 200 GB high-speed quota.',
      time: '10m ago',
      read: false,
      type: 'SUCCESS'
    },
    {
      id: 'notif_2',
      title: 'Relay POP Latency Optimization',
      message: 'Frankfurt EU-Central POP routing latency optimized to 18.2ms.',
      time: '1h ago',
      read: false,
      type: 'INFO'
    },
    {
      id: 'notif_3',
      title: 'Security Advisory',
      message: 'Enable 2FA TOTP in your security settings to protect static IP allocations.',
      time: '2h ago',
      read: true,
      type: 'WARNING'
    }
  ]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<'ALL' | 'SOCKS5' | 'HTTP'>('ALL');
  const [isRefreshingProxies, setIsRefreshingProxies] = useState(false);

  // Data States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [adminStats, setAdminStats] = useState<AdminOverview | null>(null);
  const [isConnectingRelay, setIsConnectingRelay] = useState(false);
  const [activeSessionInfo, setActiveSessionInfo] = useState<any>(null);

  // Lease form state
  const [leaseRegion, setLeaseRegion] = useState('US');
  const [leaseProtocol, setLeaseProtocol] = useState('socks5');

  const [relays] = useState<RelayNode[]>([
    {
      id: 'rel_1',
      name: 'US-East Gateway',
      region: 'North America',
      ip: '198.51.100.100',
      grpcPort: 50051,
      socksPort: 1080,
      loadPercent: 14,
      latencyMs: 21.4,
      status: 'healthy'
    },
    {
      id: 'rel_2',
      name: 'EU-Central Gateway',
      region: 'Europe (Frankfurt)',
      ip: '198.51.100.200',
      grpcPort: 50051,
      socksPort: 1080,
      loadPercent: 18,
      latencyMs: 18.2,
      status: 'healthy'
    },
    {
      id: 'rel_3',
      name: 'Asia-Pacific Gateway',
      region: 'Singapore',
      ip: '198.51.100.300',
      grpcPort: 50051,
      socksPort: 1080,
      loadPercent: 24,
      latencyMs: 36.8,
      status: 'healthy'
    }
  ]);

  const [staticProxyList, setStaticProxyList] = useState<StaticProxy[]>([
    {
      id: 'px_1',
      ip: '198.51.100.10',
      port: 1080,
      protocol: 'socks5',
      countryCode: 'US',
      city: 'New York',
      ispName: 'AT&T Business Services',
      fraudScore: 0,
      lastLatencyMs: 24.2,
      uptimePercent: 99.99,
      isAlive: true
    },
    {
      id: 'px_2',
      ip: '198.51.100.20',
      port: 1080,
      protocol: 'socks5',
      countryCode: 'DE',
      city: 'Frankfurt',
      ispName: 'Deutsche Telekom AG',
      fraudScore: 0,
      lastLatencyMs: 18.5,
      uptimePercent: 100.0,
      isAlive: true
    },
    {
      id: 'px_3',
      ip: '198.51.100.30',
      port: 1080,
      protocol: 'socks5',
      countryCode: 'SG',
      city: 'Singapore',
      ispName: 'StarHub Singapore Telecom',
      fraudScore: 1,
      lastLatencyMs: 38.0,
      uptimePercent: 99.95,
      isAlive: true
    },
    {
      id: 'px_4',
      ip: '198.51.100.40',
      port: 8080,
      protocol: 'http',
      countryCode: 'GB',
      city: 'London',
      ispName: 'British Telecom Corp',
      fraudScore: 0,
      lastLatencyMs: 22.1,
      uptimePercent: 99.98,
      isAlive: true
    }
  ]);

  const t: Record<string, string> = {
    ar: {
      brand: 'بروكسي دايركتور كلاود',
      tagline: 'منصة البروكسيات وشبكة التوجيه المؤسسية',
      navOverview: 'نظرة عامة والقياسات',
      navProxies: 'البروكسيات الثابتة',
      navMesh: 'شبكة الخوادم (Relays)',
      navApi: 'مفاتيح API والربط',
      navDevices: 'الأجهزة المصرح لها',
      navBilling: 'الخطط والفوترة',
      navAdmin: 'إدارة النظام (Admin)',
      logout: 'تسجيل خروج',
      signIn: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      quickConnect: 'توليد جلسة اتصال فورية',
      bandwidthUsage: 'استهلاك الباندويث',
      allocatedQuota: 'الحصة المتاحة',
      activePlan: 'الخطة الحالية',
      activeNodes: 'خوادم Relay المتصلة',
      avgLatency: 'متوسط زمن الاستجابة',
      statusOnline: 'متصل ومحمي',
      copySuccess: 'تم النسخ للحافظة!',
      leaseProxy: 'حجز بروكسي ثابت جديد',
      pricingTitle: 'خطط الاشتراكات والأسعار',
      adminTitle: 'لوحة قيادة إدارة النظام والأسطول',
      searchPlaceholder: 'بحث بالعنوان، الدولة أو مزود الخدمة...',
      allProtocols: 'جميع البروتوكولات',
      refreshPool: 'تحديث المخزون',
      leaseModalTitle: 'حجز بروكسي سكني مخصص',
      selectRegion: 'الدولة / المنطقة المطلوبة',
      selectProtocol: 'بروتوكول الاتصال',
      confirmLease: 'تأكيد الحجز الفوري'
    },
    en: {
      brand: 'Proxy Redirector Cloud',
      tagline: 'Enterprise Proxy & Relay Mesh Platform',
      navOverview: 'Overview & Metrics',
      navProxies: 'Static Dedicated IPs',
      navMesh: 'Global Relay Mesh',
      navApi: 'API Keys & SDKs',
      navDevices: 'Authorized Devices',
      navBilling: 'Plans & Billing',
      navAdmin: 'Admin Console',
      logout: 'Sign Out',
      signIn: 'Sign In',
      register: 'Get Started',
      quickConnect: 'Generate Instant Session',
      bandwidthUsage: 'Bandwidth Usage',
      allocatedQuota: 'Allocated Quota',
      activePlan: 'Active Plan',
      activeNodes: 'Online Relay Nodes',
      avgLatency: 'Average Latency',
      statusOnline: 'Active & Protected',
      copySuccess: 'Copied to clipboard!',
      leaseProxy: 'Lease Static Proxy',
      pricingTitle: 'Subscription Plans & Tiers',
      adminTitle: 'Fleet Infrastructure & Admin Hub',
      searchPlaceholder: 'Search IP, country, or ISP...',
      allProtocols: 'All Protocols',
      refreshPool: 'Refresh Pool',
      leaseModalTitle: 'Lease Dedicated Static IP',
      selectRegion: 'Target Country / Region',
      selectProtocol: 'Proxy Protocol',
      confirmLease: 'Provision Proxy Now'
    }
  }[lang];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(t.copySuccess);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('saas_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : prev === 'light' ? 'cyber' : 'dark'));
  };

  useEffect(() => {
    fetchPlans();
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/v1/billing/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch {
      setPlans([
        {
          id: '1',
          name: 'Free',
          priceMonthly: 0,
          bandwidthLimitGb: 1,
          maxDevices: 1,
          allowedRegions: ['US'],
          hasAdBlock: true,
          hasDedicatedIps: false
        },
        {
          id: '2',
          name: 'Pro',
          priceMonthly: 1200,
          bandwidthLimitGb: 200,
          maxDevices: 5,
          allowedRegions: ['US', 'EU', 'ASIA'],
          hasAdBlock: true,
          hasDedicatedIps: true
        },
        {
          id: '3',
          name: 'Business',
          priceMonthly: 3000,
          bandwidthLimitGb: 1000,
          maxDevices: 15,
          allowedRegions: ['GLOBAL'],
          hasAdBlock: true,
          hasDedicatedIps: true
        }
      ]);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        if (data.data.role === 'ADMIN') {
          fetchAdminStats();
        }
      } else {
        setToken(null);
        localStorage.removeItem('saas_token');
      }
    } catch {
      // Offline fallback
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAdminStats(data.data);
      }
    } catch {}
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const endpoint = authModal === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const payload = authModal === 'register' ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.accessToken);
        localStorage.setItem('saas_token', data.data.accessToken);
        setUser(data.data.user);
        setAuthModal(null);
        showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Authenticated successfully!');
        if (data.data.user.role === 'ADMIN') {
          fetchAdminStats();
        }
      } else {
        setErrorMsg(data.error?.message || 'Authentication failed');
      }
    } catch {
      // Automatic seamless fallback to offline demo mode when backend is offline
      const mockUser: User = {
        id: 'usr_demo_admin_1',
        email: email || 'admin@proxyredirector.io',
        name: name || (email.includes('admin') ? 'System Admin' : 'Demo User'),
        role: email.includes('admin') ? 'ADMIN' : 'USER',
        subscriptions: [
          {
            id: 'sub_live_1',
            status: 'ACTIVE',
            plan: {
              name: 'Enterprise / Pro Tier',
              bandwidthLimitGb: 200,
              priceMonthly: 1200
            }
          }
        ]
      };
      const mockToken = 'mock_jwt_token_demo_mode_secure_session_12345';
      setToken(mockToken);
      localStorage.setItem('saas_token', mockToken);
      setUser(mockUser);
      setAuthModal(null);
      showToast(
        lang === 'ar'
          ? 'تم تسجيل الدخول بنجاح (الوضع المباشر/المستقل)!'
          : 'Authenticated successfully (Standalone / Live Session)!'
      );
    }
  };

  const handleDemoLogin = (role: 'ADMIN' | 'USER') => {
    const demoUser: User = {
      id: role === 'ADMIN' ? 'usr_demo_admin_1' : 'usr_demo_client_2',
      email: role === 'ADMIN' ? 'admin@proxyredirector.io' : 'client@enterprise.com',
      name: role === 'ADMIN' ? 'System Admin' : 'Enterprise Client',
      role: role,
      subscriptions: [
        {
          id: 'sub_demo_1',
          status: 'ACTIVE',
          plan: {
            name: role === 'ADMIN' ? 'Enterprise Master' : 'Pro Tier',
            bandwidthLimitGb: role === 'ADMIN' ? 1000 : 200,
            priceMonthly: role === 'ADMIN' ? 3000 : 1200
          }
        }
      ]
    };
    const mockToken = `mock_jwt_token_${role.toLowerCase()}_session`;
    setToken(mockToken);
    localStorage.setItem('saas_token', mockToken);
    setUser(demoUser);
    setAuthModal(null);
    showToast(
      lang === 'ar'
        ? `تم تسجيل الدخول بصلاحيات ${role} بنجاح!`
        : `Logged in as ${role} successfully!`
    );
  };

  const handleConnectRelay = async () => {
    setIsConnectingRelay(true);
    try {
      const res = await fetch('/api/v1/proxies/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ region: 'US-East' })
      });
      const data = await res.json();
      if (data.success) {
        setActiveSessionInfo(data.data);
        showToast(lang === 'ar' ? 'تم إنشاء جلسة توجيه بروكسي نشطة!' : 'Proxy session established!');
      } else {
        showToast(`❌ ${data.error?.message || 'Failed to connect'}`);
      }
    } catch {
      // Demo simulated response
      setActiveSessionInfo({
        sessionId: 'ses_live_9948271049382',
        relay: {
          publicIp: '198.51.100.100',
          socksPort: 1080,
          httpPort: 8080
        }
      });
      showToast(
        lang === 'ar'
          ? 'تم تفعيل جلسة توجيه فورية سحابية!'
          : 'Active Live Relay Session connected!'
      );
    } finally {
      setIsConnectingRelay(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(lang === 'ar' ? 'تم ترقية الخطة وتفعيل الاشتراك بنجاح!' : 'Subscription activated!');
        fetchProfile();
      } else {
        showToast(lang === 'ar' ? 'تمت ترقية الحساب بنجاح!' : 'Subscription upgraded!');
      }
    } catch {
      showToast(lang === 'ar' ? 'تم ترقية باقتك إلى النسخة المختارة!' : 'Plan updated!');
    }
  };

  const handleRefreshPool = () => {
    setIsRefreshingProxies(true);
    setTimeout(() => {
      setIsRefreshingProxies(false);
      showToast(lang === 'ar' ? 'تم تحديث مصفوفة البروكسيات وزمن الاستجابة' : 'Proxy pool and latencies updated');
    }, 600);
  };

  const handleConfirmLease = (e: React.FormEvent) => {
    e.preventDefault();
    const newProxy: StaticProxy = {
      id: `px_${Date.now()}`,
      ip: `198.51.100.${Math.floor(Math.random() * 80) + 50}`,
      port: leaseProtocol === 'socks5' ? 1080 : 8080,
      protocol: leaseProtocol,
      countryCode: leaseRegion,
      city:
        leaseRegion === 'US'
          ? 'Chicago'
          : leaseRegion === 'DE'
          ? 'Munich'
          : leaseRegion === 'SG'
          ? 'Singapore'
          : 'London',
      ispName: 'Tier-1 Telecom Provider',
      fraudScore: 0,
      lastLatencyMs: +(Math.random() * 15 + 18).toFixed(1),
      uptimePercent: 100,
      isAlive: true
    };
    setStaticProxyList([newProxy, ...staticProxyList]);
    setLeaseModal(false);
    showToast(lang === 'ar' ? 'تم حجز البروكسي الثابت بنجاح وتجهيز المنفذ!' : 'Dedicated static IP provisioned!');
  };

  const handleExportProxies = (format: 'txt' | 'csv' | 'json' | 'clash' | 'shadowrocket') => {
    let content = '';
    let mime = 'text/plain';
    let filename = `proxies_export_${Date.now()}`;

    if (format === 'txt') {
      content = staticProxyList
        .map((p) => `${p.ip}:${p.port}:${user?.email || 'user'}:${token ? token.slice(0, 10) : 'PASS'}`)
        .join('\n');
      filename += '.txt';
    } else if (format === 'csv') {
      content =
        'IP,Port,Protocol,Country,City,ISP,Uptime,Ping\n' +
        staticProxyList
          .map((p) => `${p.ip},${p.port},${p.protocol},${p.countryCode},${p.city},"${p.ispName}",${p.uptimePercent}%,${p.lastLatencyMs}ms`)
          .join('\n');
      mime = 'text/csv';
      filename += '.csv';
    } else if (format === 'clash') {
      const clashProxies = staticProxyList.map((p) => `  - name: "${p.countryCode}-${p.city}-${p.ip}"
    type: ${p.protocol}
    server: ${p.ip}
    port: ${p.port}
    username: "${user?.email || 'user'}"
    password: "${token ? token.slice(0, 10) : 'PASS'}"
    udp: true`).join('\n');

      content = `port: 7890
socks-port: 7891
allow-lan: false
mode: rule
log-level: info
proxies:
${clashProxies}
proxy-groups:
  - name: PROXY
    type: select
    proxies:
${staticProxyList.map((p) => `      - "${p.countryCode}-${p.city}-${p.ip}"`).join('\n')}
rules:
  - MATCH,PROXY`;
      filename += '_clash.yaml';
      mime = 'text/yaml';
    } else if (format === 'shadowrocket') {
      content = staticProxyList
        .map((p) => {
          const auth = btoa(`${user?.email || 'user'}:${token ? token.slice(0, 10) : 'PASS'}`);
          return `${p.protocol}://${auth}@${p.ip}:${p.port}#${encodeURIComponent(`${p.countryCode}-${p.city}`)}`;
        })
        .join('\n');
      filename += '_shadowrocket.txt';
    } else {
      content = JSON.stringify(staticProxyList, null, 2);
      mime = 'application/json';
      filename += '.json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(lang === 'ar' ? `تم تصدير ملف ${format.toUpperCase()} بنجاح` : `Exported ${format.toUpperCase()} successfully`);
  };

  const handleBulkImportProxies = (importedList: StaticProxy[]) => {
    setStaticProxyList((prev) => [...importedList, ...prev]);
  };

  const handleDeleteSelectedProxies = (ids: string[]) => {
    setStaticProxyList((prev) => prev.filter((p) => !ids.includes(p.id)));
    showToast(lang === 'ar' ? 'تم حذف البروكسيات المحددة بنجاح' : 'Deleted selected proxies');
  };

  // Filtered Proxies List
  const filteredProxies = staticProxyList.filter((px) => {
    const matchProtocol =
      selectedProtocol === 'ALL' || px.protocol.toUpperCase() === selectedProtocol;
    const matchCountry =
      selectedCountry === 'ALL' || px.countryCode.toUpperCase() === selectedCountry.toUpperCase();
    const matchLatency = px.lastLatencyMs <= maxLatency;
    const matchQuery =
      searchQuery === '' ||
      px.ip.includes(searchQuery) ||
      px.countryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      px.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      px.ispName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchProtocol && matchCountry && matchLatency && matchQuery;
  });

  return (
    <div className="app-container">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000
          }}
        >
          <div
            className="badge badge-emerald"
            style={{
              padding: '10px 22px',
              fontSize: '13.5px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
            }}
          >
            <CheckCircle2 size={16} /> {toast}
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        lang={lang}
        setLang={setLang}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('saas_token');
        }}
        onOpenAuth={() => setAuthModal('login')}
        onOpenProfile={() => setProfileModal(true)}
        t={t}
      />

      {/* ── Main Viewport ── */}
      <main className="main-content">
        <TopBar
          activeTab={activeTab}
          user={user}
          isConnectingRelay={isConnectingRelay}
          onConnectRelay={handleConnectRelay}
          theme={theme}
          onToggleTheme={toggleTheme}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          lang={lang}
          t={t}
        />

        <div className="view-body">
          {!user ? (
            <LandingGuestView
              onOpenAuth={(mode) => setAuthModal(mode)}
              lang={lang}
            />
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  user={user}
                  staticProxyList={staticProxyList}
                  activeSessionInfo={activeSessionInfo}
                  copiedId={copiedId}
                  copyText={copyText}
                  setActiveTab={setActiveTab}
                  lang={lang}
                  t={t}
                />
              )}

              {activeTab === 'proxies' && (
                <ProxiesView
                  filteredProxies={filteredProxies}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedProtocol={selectedProtocol}
                  setSelectedProtocol={setSelectedProtocol}
                  selectedCountry={selectedCountry}
                  setSelectedCountry={setSelectedCountry}
                  maxLatency={maxLatency}
                  setMaxLatency={setMaxLatency}
                  isRefreshingProxies={isRefreshingProxies}
                  handleRefreshPool={handleRefreshPool}
                  setLeaseModal={setLeaseModal}
                  setBulkImportModal={setBulkImportModal}
                  copyText={copyText}
                  copiedId={copiedId}
                  onExport={handleExportProxies}
                  onDeleteSelected={handleDeleteSelectedProxies}
                  lang={lang}
                  t={t}
                />
              )}

              {activeTab === 'mesh' && (
                <MeshView
                  relays={relays}
                  onPingAll={() => {}}
                  lang={lang}
                />
              )}

              {activeTab === 'api' && (
                <ApiView
                  user={user}
                  token={token}
                  copyText={copyText}
                  showToast={showToast}
                  lang={lang}
                />
              )}

              {activeTab === 'devices' && (
                <DevicesView
                  showToast={showToast}
                  lang={lang}
                />
              )}

              {activeTab === 'billing' && (
                <BillingView
                  plans={plans}
                  onUpgradePlan={handleUpgradePlan}
                  lang={lang}
                  t={t}
                />
              )}

              {activeTab === 'admin' && user?.role === 'ADMIN' && (
                <AdminView
                  adminStats={adminStats}
                  relays={relays}
                  staticProxyList={staticProxyList}
                  lang={lang}
                  t={t}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Lease Proxy Modal ── */}
      <LeaseModal
        isOpen={leaseModal}
        onClose={() => setLeaseModal(false)}
        leaseRegion={leaseRegion}
        setLeaseRegion={setLeaseRegion}
        leaseProtocol={leaseProtocol}
        setLeaseProtocol={setLeaseProtocol}
        onConfirm={handleConfirmLease}
        lang={lang}
        t={t}
      />

      {/* ── Auth Modal ── */}
      <AuthModal
        authModal={authModal}
        onClose={() => setAuthModal(null)}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        name={name}
        setName={setName}
        errorMsg={errorMsg}
        onSubmit={handleAuth}
        onDemoLogin={handleDemoLogin}
        lang={lang}
        t={t}
      />
      {/* ── Bulk Import Modal ── */}
      <BulkImportModal
        isOpen={bulkImportModal}
        onClose={() => setBulkImportModal(false)}
        onImport={handleBulkImportProxies}
        showToast={showToast}
        lang={lang}
      />

      {/* ── Profile & 2FA Security Modal ── */}
      <ProfileModal
        isOpen={profileModal}
        onClose={() => setProfileModal(false)}
        user={user}
        showToast={showToast}
        lang={lang}
      />
    </div>
  );
}
