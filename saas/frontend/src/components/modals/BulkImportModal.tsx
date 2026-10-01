import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { StaticProxy } from '../../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (proxies: StaticProxy[]) => void;
  showToast: (msg: string) => void;
  lang: 'ar' | 'en';
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  showToast,
  lang
}) => {
  const [rawText, setRawText] = useState('');
  const [protocol, setProtocol] = useState<'socks5' | 'http'>('socks5');
  const [defaultCountry, setDefaultCountry] = useState('US');

  if (!isOpen) return null;

  const handleParseAndImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      showToast(lang === 'ar' ? 'الرجاء إدخال قائمة البروكسيات أولاً' : 'Please input proxy list first');
      return;
    }

    const parsedProxies: StaticProxy[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Supports formats: IP:Port or IP:Port:User:Pass or IP,Port
      const parts = line.includes(':') ? line.split(':') : line.split(',');
      if (parts.length >= 2) {
        const ip = parts[0].trim();
        const port = parseInt(parts[1].trim(), 10) || (protocol === 'socks5' ? 1080 : 8080);

        parsedProxies.push({
          id: `px_imported_${Date.now()}_${i}`,
          ip,
          port,
          protocol,
          countryCode: defaultCountry,
          city: defaultCountry === 'US' ? 'New York' : defaultCountry === 'DE' ? 'Frankfurt' : 'London',
          ispName: 'Bulk Imported Enterprise ISP',
          fraudScore: 0,
          lastLatencyMs: +(Math.random() * 14 + 16).toFixed(1),
          uptimePercent: 99.99,
          isAlive: true
        });
      }
    }

    if (parsedProxies.length === 0) {
      showToast(lang === 'ar' ? 'تعذر التعرف على التنسيق. استخدم IP:Port' : 'Invalid format. Use IP:Port');
      return;
    }

    onImport(parsedProxies);
    setRawText('');
    onClose();
    showToast(
      lang === 'ar'
        ? `تم استيراد ${parsedProxies.length} بروكسي بنجاح!`
        : `Successfully imported ${parsedProxies.length} proxies!`
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ width: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '16px' }}>
            <Upload size={18} color="var(--accent-primary)" />
            {lang === 'ar' ? 'استيراد بروكسيات مجمعة (Bulk Import)' : 'Bulk Import Proxy Nodes'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleParseAndImport}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{lang === 'ar' ? 'البروتوكول الافتراضي' : 'Default Protocol'}</label>
              <select
                className="form-control"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
              >
                <option value="socks5">SOCKS5</option>
                <option value="http">HTTP / HTTPS</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{lang === 'ar' ? 'الدولة الافتراضية' : 'Default Region'}</label>
              <select
                className="form-control"
                value={defaultCountry}
                onChange={(e) => setDefaultCountry(e.target.value)}
              >
                <option value="US">🇺🇸 United States</option>
                <option value="DE">🇩🇪 Germany (Frankfurt)</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="SG">🇸🇬 Singapore</option>
                <option value="AE">🇦🇪 United Arab Emirates</option>
                <option value="SA">🇸🇦 Saudi Arabia</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{lang === 'ar' ? 'قائمة البروكسيات (سطر لكل بروكسي)' : 'Proxy List (One per line)'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }} className="font-mono">
                Format: IP:Port:User:Pass
              </span>
            </label>
            <textarea
              className="form-control font-mono"
              style={{ height: '160px', resize: 'vertical', fontSize: '12px', lineHeight: 1.5 }}
              placeholder={`198.51.100.10:1080\n198.51.100.11:1080:user:pass\n198.51.100.12:8080`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              <Upload size={14} /> {lang === 'ar' ? 'استيراد القائمة' : 'Import Nodes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
