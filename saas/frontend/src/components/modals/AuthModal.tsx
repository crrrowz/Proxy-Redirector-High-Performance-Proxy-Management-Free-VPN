import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface AuthModalProps {
  authModal: 'login' | 'register' | null;
  onClose: () => void;
  email: string;
  setEmail: (e: string) => void;
  password: string;
  setPassword: (p: string) => void;
  name: string;
  setName: (n: string) => void;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
  onDemoLogin?: (role: 'ADMIN' | 'USER') => void;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  authModal,
  onClose,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  errorMsg,
  onSubmit,
  onDemoLogin,
  lang,
  t
}) => {
  if (!authModal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
            {authModal === 'register' ? t.register : t.signIn}
          </h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 1-Click Quick Demo Login Shortcuts */}
        {onDemoLogin && (
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: '18px'
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {lang === 'ar' ? 'تسجيل دخول سريع للتجربة والاستعراض:' : 'Instant Quick Demo Access:'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ flex: 1, borderColor: 'var(--accent-purple)', color: '#c084fc' }}
                onClick={() => onDemoLogin('ADMIN')}
              >
                <ShieldCheck size={13} /> Admin Console
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ flex: 1, borderColor: 'var(--accent-primary)', color: '#60a5fa' }}
                onClick={() => onDemoLogin('USER')}
              >
                <UserCheck size={13} /> Client Portal
              </button>
            </div>
          </div>
        )}

        {errorMsg && <div className="alert-box alert-error">{errorMsg}</div>}

        <form onSubmit={onSubmit}>
          {authModal === 'register' && (
            <div className="form-group">
              <label>{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Administrator"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@proxyredirector.io"
              required
            />
          </div>

          <div className="form-group">
            <label>{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '24px'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              {authModal === 'register' ? t.register : t.signIn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
