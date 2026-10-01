import { useState, useEffect } from 'react';
import { WindowMinimise, Quit } from "../../../wailsjs/runtime/runtime";
import { GetSystemInfo } from "../../../wailsjs/go/main/App";
import { Minus, X, Shield } from "lucide-react";

export function TitleBar() {
  const [appInfo, setAppInfo] = useState<any>(null);

  useEffect(() => {
    // Only call GetSystemInfo if it's available (avoids crashing in dev if bindings aren't ready)
    const w = window as any;
    if (w.go && w.go.main && w.go.main.App && w.go.main.App.GetSystemInfo) {
      GetSystemInfo().then(setAppInfo).catch(console.error);
    }
  }, []);

  return (
    <div 
      className="wails-draggable flex-center"
      style={{
        height: '48px',
        width: '100%',
        backgroundColor: 'rgba(11, 14, 20, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-light)',
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: '16px',
        zIndex: 100
      }}
    >
      <div className="flex-center" style={{ gap: '8px', pointerEvents: 'none' }}>
        <Shield size={18} className="text-blue" style={{ color: 'var(--accent-primary)' }} />
        <span className="heading-3 font-heading" style={{ color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
          {appInfo ? appInfo.app_name : "Antigravity Proxy"}
        </span>
        {appInfo && (
          <span className="caption" style={{ color: 'var(--text-muted)', fontSize: '10px', marginLeft: '4px' }}>
            v{appInfo.version}
          </span>
        )}
      </div>
      
      <div 
        style={{
          display: 'flex',
          height: '100%',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        <button 
          onClick={WindowMinimise}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            width: '48px', height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Minus size={16} />
        </button>
        <button 
          onClick={Quit}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            width: '48px', height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-danger)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
