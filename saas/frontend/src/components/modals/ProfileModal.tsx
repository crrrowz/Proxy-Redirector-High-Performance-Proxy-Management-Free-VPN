import React, { useState } from 'react';
import { X, Shield, QrCode, KeyRound, Check, CheckCircle2 } from 'lucide-react';
import { User } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  showToast: (msg: string) => void;
  lang: 'ar' | 'en';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  showToast,
  lang
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security'>('profile');
  const [name, setName] = useState(user?.name || 'System User');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  if (!isOpen) return null;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(
      lang === 'ar' ? 'تم تحديث بيانات الحساب بنجاح' : 'Profile updated successfully'
    );
    onClose();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast(
        lang === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 chars'
      );
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    showToast(
      lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'
    );
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length === 6) {
      setIs2FAEnabled(true);
      setShowQR(false);
      setTwoFactorCode('');
      showToast(
        lang === 'ar' ? 'تم تفعيل المصادقة الثنائية 2FA بنجاح!' : 'Two-Factor Authentication enabled!'
      );
    } else {
      showToast(
        lang === 'ar' ? 'الرجاء إدخال رمز التحقق المكون من 6 أرقام' : 'Please enter 6-digit TOTP code'
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px' }}>
            <Shield size={18} color="var(--accent-primary)" />
            {lang === 'ar' ? 'إعدادات الحساب والأمان' : 'Account & Security Settings'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={15} />
          </button>
        </div>

        {/* Sub Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`btn btn-sm ${activeSubTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveSubTab('profile')}
          >
            {lang === 'ar' ? 'الملف الشخصي' : 'Profile Info'}
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'security' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveSubTab('security')}
          >
            {lang === 'ar' ? 'الأمان و 2FA' : 'Security & 2FA'}
          </button>
        </div>

        {activeSubTab === 'profile' && (
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input
                type="email"
                className="form-control"
                value={user?.email || 'user@example.com'}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>{lang === 'ar' ? 'الدور في النظام' : 'Account Role'}</label>
              <input
                type="text"
                className="form-control"
                value={user?.role || 'USER'}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Check size={14} /> {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
            </button>
          </form>
        )}

        {activeSubTab === 'security' && (
          <div>
            {/* 2FA Toggle Card */}
            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <KeyRound size={15} color="var(--accent-emerald)" />
                    {lang === 'ar' ? 'المصادقة الثنائية (TOTP 2FA)' : 'Two-Factor Authentication (2FA)'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {is2FAEnabled
                      ? (lang === 'ar' ? 'حسابك محمي برمز التحقق الثنائي.' : 'Account is protected with authenticator app.')
                      : (lang === 'ar' ? 'أضف طبقة أمان إضافية باستخدام Google Authenticator.' : 'Add an extra layer of security using Google Authenticator.')}
                  </div>
                </div>
                {is2FAEnabled ? (
                  <span className="badge badge-emerald">
                    <CheckCircle2 size={12} /> Enabled
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowQR(!showQR)}
                  >
                    <QrCode size={13} /> {showQR ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? 'إعداد' : 'Setup')}
                  </button>
                )}
              </div>

              {showQR && !is2FAEnabled && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      {/* SVG Mock QR Code */}
                      <svg width="110" height="110" viewBox="0 0 100 100">
                        <rect width="100" height="100" fill="#ffffff" />
                        <rect x="10" y="10" width="30" height="30" fill="#000000" />
                        <rect x="15" y="15" width="20" height="20" fill="#ffffff" />
                        <rect x="20" y="20" width="10" height="10" fill="#000000" />
                        <rect x="60" y="10" width="30" height="30" fill="#000000" />
                        <rect x="65" y="15" width="20" height="20" fill="#ffffff" />
                        <rect x="70" y="20" width="10" height="10" fill="#000000" />
                        <rect x="10" y="60" width="30" height="30" fill="#000000" />
                        <rect x="15" y="65" width="20" height="20" fill="#ffffff" />
                        <rect x="20" y="70" width="10" height="10" fill="#000000" />
                        <rect x="50" y="50" width="10" height="10" fill="#000000" />
                        <rect x="70" y="60" width="15" height="15" fill="#000000" />
                        <rect x="55" y="75" width="20" height="15" fill="#000000" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }} className="font-mono">
                      Secret: JBSWY3DPEHPK3PXP
                    </div>
                  </div>

                  <form onSubmit={handleVerify2FA} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="6-digit code (e.g. 123456)"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 700 }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">
                      Verify
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword}>
              <div className="form-group">
                <label>{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Min 8 characters"
                />
              </div>
              <button type="submit" className="btn btn-outline" style={{ width: '100%' }}>
                {lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
