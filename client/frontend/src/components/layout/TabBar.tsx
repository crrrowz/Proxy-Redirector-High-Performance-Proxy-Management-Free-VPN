import { Home, Smartphone, Settings, RefreshCw } from 'lucide-react';

type TabBarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'HOME' },
    { id: 'rotation', icon: RefreshCw, label: 'SURGE' },
    { id: 'devices', icon: Smartphone, label: 'DEVICES' },
    { id: 'settings', icon: Settings, label: 'SETTINGS' }
  ];

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80%',
      maxWidth: '380px',
      height: '56px',
      backgroundColor: 'var(--bg-panel)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-full)',
      display: 'flex',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      padding: '0 6px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 100
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              height: '44px',
              width: '60px',
              borderRadius: 'var(--radius-full)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'var(--transition-fast)',
              position: 'relative'
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'var(--border-active)',
                borderRadius: 'var(--radius-full)',
                zIndex: -1
              }} />
            )}
            <Icon 
              size={18} 
              style={{ 
                marginBottom: '4px',
                color: isActive ? 'var(--accent-primary)' : 'inherit',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'var(--transition-fast)'
              }} 
            />
            <span className="caption" style={{ 
              fontSize: '8px',
              opacity: isActive ? 1 : 0.6,
              letterSpacing: '0.05em'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
