import React, { useState } from 'react';
import { RefreshCw, Plus, Search, Copy, Download, Activity, CheckCircle, Upload, Trash2, SlidersHorizontal, Globe2 } from 'lucide-react';
import { StaticProxy } from '../../types';

interface ProxiesViewProps {
  filteredProxies: StaticProxy[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedProtocol: 'ALL' | 'SOCKS5' | 'HTTP';
  setSelectedProtocol: (p: 'ALL' | 'SOCKS5' | 'HTTP') => void;
  selectedCountry: string;
  setSelectedCountry: (c: string) => void;
  maxLatency: number;
  setMaxLatency: (l: number) => void;
  isRefreshingProxies: boolean;
  handleRefreshPool: () => void;
  setLeaseModal: (open: boolean) => void;
  setBulkImportModal: (open: boolean) => void;
  copyText: (text: string, id: string) => void;
  copiedId: string | null;
  onExport: (format: 'txt' | 'csv' | 'json' | 'clash' | 'shadowrocket') => void;
  onDeleteSelected?: (ids: string[]) => void;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const ProxiesView: React.FC<ProxiesViewProps> = ({
  filteredProxies,
  searchQuery,
  setSearchQuery,
  selectedProtocol,
  setSelectedProtocol,
  selectedCountry,
  setSelectedCountry,
  maxLatency,
  setMaxLatency,
  isRefreshingProxies,
  handleRefreshPool,
  setLeaseModal,
  setBulkImportModal,
  copyText,
  copiedId,
  onExport,
  onDeleteSelected,
  lang,
  t
}) => {
  const [testingProxyId, setTestingProxyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { latency: number; ok: boolean }>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleTestProxy = (id: string) => {
    setTestingProxyId(id);
    setTimeout(() => {
      const simulatedLatency = +(Math.random() * 12 + 16).toFixed(1);
      setTestResults((prev) => ({
        ...prev,
        [id]: { latency: simulatedLatency, ok: true }
      }));
      setTestingProxyId(null);
    }, 650);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProxies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProxies.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            {lang === 'ar'
              ? 'مخزون البروكسيات الثابتة السكنية (Residential ISP Nodes)'
              : 'Dedicated Residential Proxy Pool'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onExport('txt')}
                title="Export as IP:Port:User:Pass"
              >
                <Download size={13} /> TXT
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onExport('csv')}
                title="Export as CSV"
              >
                CSV
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onExport('json')}
                title="Export as JSON"
              >
                JSON
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onExport('clash')}
                title="Export Clash YAML Configuration"
                style={{ color: '#38bdf8' }}
              >
                Clash
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onExport('shadowrocket')}
                title="Export Shadowrocket / Proxifier Config"
                style={{ color: 'var(--accent-purple)' }}
              >
                Shadowrocket
              </button>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleRefreshPool}
              disabled={isRefreshingProxies}
            >
              <RefreshCw
                size={13}
                className={isRefreshingProxies ? 'animate-spin' : ''}
              />{' '}
              {t.refreshPool}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setBulkImportModal(true)}
              title="Bulk Import Proxies"
            >
              <Upload size={14} /> {lang === 'ar' ? 'استيراد مجمّع' : 'Bulk Import'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setLeaseModal(true)}
            >
              <Plus size={14} /> {t.leaseProxy}
            </button>
          </div>
        </div>

        <div className="panel-body">
          {/* Advanced Multi-Filter Toolbar */}
          <div className="table-toolbar" style={{ gap: '14px', alignItems: 'center' }}>
            <div className="search-input-wrap">
              <Search size={15} />
              <input
                type="text"
                className="form-control"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Country Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe2 size={14} color="var(--text-tertiary)" />
              <select
                className="form-control"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12.5px', width: 'auto' }}
              >
                <option value="ALL">{lang === 'ar' ? 'جميع الدول' : 'All Countries'}</option>
                <option value="US">🇺🇸 United States</option>
                <option value="DE">🇩🇪 Germany</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="SG">🇸🇬 Singapore</option>
                <option value="AE">🇦🇪 UAE</option>
                <option value="SA">🇸🇦 Saudi Arabia</option>
              </select>
            </div>

            {/* Max Latency Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <SlidersHorizontal size={13} color="var(--text-tertiary)" />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {lang === 'ar' ? 'أقصى بينج:' : 'Max Ping:'} <strong>{maxLatency}ms</strong>
              </span>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={maxLatency}
                onChange={(e) => setMaxLatency(Number(e.target.value))}
                style={{ width: '80px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Protocol Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['ALL', 'SOCKS5', 'HTTP'] as const).map((proto) => (
                <button
                  key={proto}
                  className={`btn btn-sm ${
                    selectedProtocol === proto ? 'btn-primary' : 'btn-outline'
                  }`}
                  onClick={() => setSelectedProtocol(proto)}
                >
                  {proto === 'ALL' ? t.allProtocols : proto}
                </button>
              ))}
            </div>

            {/* Batch Delete Action */}
            {selectedIds.length > 0 && onDeleteSelected && (
              <button
                className="btn btn-outline btn-sm"
                style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)', marginInlineStart: 'auto' }}
                onClick={() => {
                  onDeleteSelected(selectedIds);
                  setSelectedIds([]);
                }}
              >
                <Trash2 size={13} /> {lang === 'ar' ? `حذف المحدد (${selectedIds.length})` : `Delete Selected (${selectedIds.length})`}
              </button>
            )}
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={filteredProxies.length > 0 && selectedIds.length === filteredProxies.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Country</th>
                  <th>Node IP</th>
                  <th>Protocol</th>
                  <th>ISP / Carrier</th>
                  <th>Uptime SLA</th>
                  <th>Ping ms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProxies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: 'center',
                        padding: '32px',
                        color: 'var(--text-tertiary)'
                      }}
                    >
                      No proxies match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProxies.map((px) => {
                    const testResult = testResults[px.id];
                    const isTesting = testingProxyId === px.id;
                    const isSelected = selectedIds.includes(px.id);

                    return (
                      <tr key={px.id} style={isSelected ? { background: 'rgba(59, 130, 246, 0.06)' } : {}}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(px.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <strong>{px.countryCode}</strong> — {px.city}
                        </td>
                        <td className="font-mono">
                          {px.ip}:{px.port}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              px.protocol === 'socks5' ? 'badge-blue' : 'badge-purple'
                            }`}
                          >
                            {px.protocol.toUpperCase()}
                          </span>
                        </td>
                        <td>{px.ispName}</td>
                        <td>
                          <span className="badge badge-emerald">{px.uptimePercent}%</span>
                        </td>
                        <td className="font-mono">
                          {testResult ? (
                            <span style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> {testResult.latency} ms
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>
                              {px.lastLatencyMs} ms
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleTestProxy(px.id)}
                              disabled={isTesting}
                              title="Live Probe Ping"
                            >
                              <Activity size={12} className={isTesting ? 'animate-spin' : ''} />
                              {isTesting ? (lang === 'ar' ? 'جاري الفحص...' : 'Testing...') : (lang === 'ar' ? 'فحص' : 'Probe')}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() =>
                                copyText(
                                  `${px.protocol}://${px.ip}:${px.port}`,
                                  `copy_${px.id}`
                                )
                              }
                            >
                              <Copy size={12} />{' '}
                              {copiedId === `copy_${px.id}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
