import React, { useState } from 'react';
import { Zap, Sun, Moon, Sparkles, Bell, CheckCircle2, AlertTriangle, Info, Check } from 'lucide-react';
import { User, NotificationItem } from '../../types';

interface TopBarProps {
  activeTab: string;
  user: User | null;
  isConnectingRelay: boolean;
  onConnectRelay: () => void;
  theme: 'dark' | 'light' | 'cyber';
  onToggleTheme: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  user,
  isConnectingRelay,
  onConnectRelay,
  theme,
  onToggleTheme,
  notifications,
  onMarkAllRead,
  lang,
  t
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTabTitle = () => {
    if (!user) {
      return lang === 'ar' ? 'بوابة بروكسي دايركتور كلاود' : 'Proxy Redirector Cloud Portal';
    }
    switch (activeTab) {
      case 'overview':
        return t.navOverview;
      case 'proxies':
        return t.navProxies;
      case 'mesh':
        return t.navMesh;
      case 'api':
        return t.navApi;
      case 'devices':
        return t.navDevices || 'Connected Devices';
      case 'billing':
        return t.navBilling;
      case 'admin':
        return t.navAdmin;
      default:
        return t.navOverview;
    }
  };

  return (
    <header className="top-bar">
      <div className="page-title-group">
        <h1>{getTabTitle()}</h1>
        <p>{t.tagline}</p>
      </div>

      <div className="top-actions">
        {/* Notifications Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            aria-label="Toggle notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="notification-badge-count">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                  {lang === 'ar' ? 'الإشعارات والتنبيهات' : 'System Alerts'}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '11px', padding: '2px 6px' }}
                    onClick={onMarkAllRead}
                  >
                    <Check size={11} /> {lang === 'ar' ? 'تعيين كمقروء' : 'Mark all read'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                {notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                      {n.type === 'SUCCESS' && <CheckCircle2 size={13} color="var(--accent-emerald)" />}
                      {n.type === 'WARNING' && <AlertTriangle size={13} color="var(--accent-amber)" />}
                      {n.type === 'INFO' && <Info size={13} color="var(--accent-primary)" />}
                      {n.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {n.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch theme (Current: ${theme})`}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' && <Moon size={16} />}
          {theme === 'light' && <Sun size={16} />}
          {theme === 'cyber' && <Sparkles size={16} color="var(--accent-purple)" />}
        </button>

        <span className="badge badge-emerald">
          <span className="status-dot" /> {t.statusOnline} (SLA 99.99%)
        </span>
        {user && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onConnectRelay}
            disabled={isConnectingRelay}
          >
            <Zap size={14} /> {isConnectingRelay ? 'Connecting...' : t.quickConnect}
          </button>
        )}
      </div>
    </header>
  );
};
