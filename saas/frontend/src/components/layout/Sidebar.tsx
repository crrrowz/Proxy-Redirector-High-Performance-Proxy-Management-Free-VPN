import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Server,
  Key,
  CreditCard,
  Globe,
  Users,
  LogOut,
  Smartphone
} from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  t: Record<string, string>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang,
  setLang,
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenAuth,
  onOpenProfile,
  t
}) => {
  const handleNavClick = (tabKey: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setActiveTab(tabKey);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <a href="#" className="sidebar-brand">
          <div className="brand-glyph">P</div>
          <span>{t.brand}</span>
        </a>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          title="تبديل اللغة / Switch Language"
        >
          <Globe size={13} /> {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">
          {lang === 'ar' ? 'لوحة التحكم والشبكة' : 'TELEMETRY & MESH'}
        </div>

        <button
          className={`nav-item ${user && activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleNavClick('overview')}
        >
          <LayoutDashboard size={16} />
          <span>{t.navOverview}</span>
        </button>

        <button
          className={`nav-item ${user && activeTab === 'proxies' ? 'active' : ''}`}
          onClick={() => handleNavClick('proxies')}
        >
          <ShieldCheck size={16} />
          <span>{t.navProxies}</span>
        </button>

        <button
          className={`nav-item ${user && activeTab === 'mesh' ? 'active' : ''}`}
          onClick={() => handleNavClick('mesh')}
        >
          <Server size={16} />
          <span>{t.navMesh}</span>
        </button>

        <div className="nav-section-title">
          {lang === 'ar' ? 'التطوير والحساب' : 'DEVELOPER & BILLING'}
        </div>

        <button
          className={`nav-item ${user && activeTab === 'api' ? 'active' : ''}`}
          onClick={() => handleNavClick('api')}
        >
          <Key size={16} />
          <span>{t.navApi}</span>
        </button>

        <button
          className={`nav-item ${user && activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => handleNavClick('devices')}
        >
          <Smartphone size={16} />
          <span>{t.navDevices || (lang === 'ar' ? 'الأجهزة المتصلة' : 'Connected Devices')}</span>
        </button>

        <button
          className={`nav-item ${user && activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => handleNavClick('billing')}
        >
          <CreditCard size={16} />
          <span>{t.navBilling}</span>
        </button>

        {user?.role === 'ADMIN' && (
          <>
            <div className="nav-section-title">
              {lang === 'ar' ? 'إدارة المنصة' : 'ADMIN FLEET'}
            </div>
            <button
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Users size={16} />
              <span>{t.navAdmin}</span>
            </button>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <div
              className="user-profile"
              onClick={onOpenProfile}
              style={{ cursor: 'pointer', flex: 1, padding: '4px', borderRadius: 'var(--radius-sm)' }}
              title={lang === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
            >
              <div className="avatar">{user.email[0].toUpperCase()}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {user.name || user.email.split('@')[0]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {user.role}
                </div>
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={onLogout}
              title={t.logout}
            >
              <LogOut size={14} />
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={onOpenAuth}
          >
            <Key size={14} /> {t.signIn}
          </button>
        )}
      </div>
    </aside>
  );
};
