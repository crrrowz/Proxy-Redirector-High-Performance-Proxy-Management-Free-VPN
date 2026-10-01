import React from 'react';

interface LeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaseRegion: string;
  setLeaseRegion: (r: string) => void;
  leaseProtocol: string;
  setLeaseProtocol: (p: string) => void;
  onConfirm: (e: React.FormEvent) => void;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const LeaseModal: React.FC<LeaseModalProps> = ({
  isOpen,
  onClose,
  leaseRegion,
  setLeaseRegion,
  leaseProtocol,
  setLeaseProtocol,
  onConfirm,
  lang,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
            {t.leaseModalTitle}
          </h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={onConfirm}>
          <div className="form-group">
            <label>{t.selectRegion}</label>
            <select
              className="form-control"
              value={leaseRegion}
              onChange={(e) => setLeaseRegion(e.target.value)}
            >
              <option value="US">🇺🇸 United States (New York / Chicago)</option>
              <option value="DE">🇩🇪 Germany (Frankfurt / Munich)</option>
              <option value="SG">🇸🇬 Singapore</option>
              <option value="GB">🇬🇧 United Kingdom (London)</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t.selectProtocol}</label>
            <select
              className="form-control"
              value={leaseProtocol}
              onChange={(e) => setLeaseProtocol(e.target.value)}
            >
              <option value="socks5">SOCKS5 (Ultra-Fast & Raw TCP/UDP)</option>
              <option value="http">HTTP / HTTPS (Web & API Scrapers)</option>
            </select>
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
              {t.confirmLease}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
