import React, { useState } from 'react';
import { Plus, Copy, Terminal, Trash2, Key, Play, Code2, CheckCircle2 } from 'lucide-react';
import { ApiKeyItem, User } from '../../types';

interface ApiViewProps {
  user: User | null;
  token: string | null;
  copyText: (text: string, id: string) => void;
  showToast: (msg: string) => void;
  lang: 'ar' | 'en';
}

export const ApiView: React.FC<ApiViewProps> = ({
  user,
  token,
  copyText,
  showToast,
  lang
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    {
      id: 'key_1',
      name: 'Default Production Scraper Key',
      prefix: 'pk_live_9a8b',
      createdAt: '2026-09-15',
      expiresAt: null
    }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedCodeLang, setSelectedCodeLang] = useState<
    'curl' | 'python' | 'node' | 'go'
  >('curl');

  // Interactive REST API Console state
  const [testEndpoint, setTestEndpoint] = useState('/api/v1/proxies/pool');
  const [testMethod, setTestMethod] = useState<'GET' | 'POST'>('GET');
  const [isExecutingApi, setIsExecutingApi] = useState(false);
  const [apiResponseJson, setApiResponseJson] = useState<string | null>(null);
  const [apiExecutionStatus, setApiExecutionStatus] = useState<number | null>(null);

  const handleCreateKey = () => {
    const keyName = newKeyName.trim() || 'Development SDK Key';
    const rawKey = `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    const newKeyObj: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: keyName,
      prefix: rawKey.slice(0, 12) + '...',
      key: rawKey,
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: null
    };
    setApiKeys([newKeyObj, ...apiKeys]);
    setGeneratedKey(rawKey);
    setNewKeyName('');
    showToast(
      lang === 'ar' ? 'تم إنشاء مفتاح الـ API بنجاح!' : 'API Key created successfully!'
    );
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    showToast(
      lang === 'ar' ? 'تم إلغاء مفتاح الـ API بنجاح' : 'API Key revoked successfully'
    );
  };

  const handleExecuteApiTest = async () => {
    setIsExecutingApi(true);
    setApiResponseJson(null);
    setApiExecutionStatus(null);

    try {
      const res = await fetch(testEndpoint, {
        method: testMethod,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'demo_token'}`
        }
      });
      const data = await res.json();
      setApiExecutionStatus(res.status);
      setApiResponseJson(JSON.stringify(data, null, 2));
    } catch {
      // Offline fallback mock response
      setTimeout(() => {
        setApiExecutionStatus(200);
        if (testEndpoint.includes('pool')) {
          setApiResponseJson(
            JSON.stringify(
              {
                success: true,
                statusCode: 200,
                data: {
                  count: 4,
                  availableNodes: ['198.51.100.10:1080', '198.51.100.20:1080', '198.51.100.30:1080'],
                  fraudShield: 'CLEAN',
                  latencyMsAvg: 22.4
                },
                timestamp: new Date().toISOString()
              },
              null,
              2
            )
          );
        } else {
          setApiResponseJson(
            JSON.stringify(
              {
                success: true,
                statusCode: 200,
                data: {
                  sessionId: 'ses_live_9948271049382',
                  status: 'CONNECTED',
                  allocatedRelay: '198.51.100.100:50051',
                  encryption: 'mTLS 1.3'
                },
                timestamp: new Date().toISOString()
              },
              null,
              2
            )
          );
        }
        setIsExecutingApi(false);
      }, 400);
      return;
    } finally {
      setIsExecutingApi(false);
    }
  };

  const codeSnippets = {
    curl: `curl -x socks5h://${user?.email || 'user'}:${
      token ? token.slice(0, 15) : 'TOKEN'
    }@198.51.100.10:1080 https://api.ipify.org?format=json`,
    python: `import requests

proxies = {
    "http": "socks5h://${user?.email || 'user'}:${
      token ? token.slice(0, 15) : 'TOKEN'
    }@198.51.100.10:1080",
    "https": "socks5h://${user?.email || 'user'}:${
      token ? token.slice(0, 15) : 'TOKEN'
    }@198.51.100.10:1080"
}

resp = requests.get("https://api.ipify.org?format=json", proxies=proxies, timeout=10)
print(resp.json())`,
    node: `import { ProxyAgent, fetch } from 'undici';

const proxyAgent = new ProxyAgent('socks5://${user?.email || 'user'}:${
      token ? token.slice(0, 15) : 'TOKEN'
    }@198.51.100.10:1080');
const response = await fetch('https://api.ipify.org?format=json', { dispatcher: proxyAgent });
const data = await response.json();
console.log(data);`,
    go: `package main

import (
	"fmt"
	"net/http"
	"golang.org/x/net/proxy"
)

func main() {
	dialer, _ := proxy.SOCKS5("tcp", "198.51.100.10:1080", &proxy.Auth{
		User: "${user?.email || 'user'}",
		Password: "${token ? token.slice(0, 15) : 'TOKEN'}",
	}, proxy.Direct)

	transport := &http.Transport{Dial: dialer.Dial}
	client := &http.Client{Transport: transport}
	resp, _ := client.Get("https://api.ipify.org?format=json")
	fmt.Println("Connected via dedicated static IP")
}`
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            {lang === 'ar' ? 'مفاتيح API للمطورين' : 'REST & gRPC Developer API Keys'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-control"
              placeholder={
                lang === 'ar' ? 'اسم المفتاح (مثال: Worker 01)' : 'Key Name (e.g. Scraper 1)'
              }
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              style={{ width: '220px' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleCreateKey}>
              <Plus size={14} /> {lang === 'ar' ? 'إنشاء مفتاح' : 'Create Key'}
            </button>
          </div>
        </div>
        <div className="panel-body">
          {generatedKey && (
            <div
              className="alert-box alert-success"
              style={{
                justifyContent: 'space-between',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {lang === 'ar'
                    ? 'احفظ هذا المفتاح فوراً، لن يتم عرضه بالكامل مرة أخرى:'
                    : 'Save this API key immediately, it will not be displayed in full again:'}
                </div>
                <div className="font-mono" style={{ fontWeight: 700, marginTop: '4px' }}>
                  {generatedKey}
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => copyText(generatedKey, 'apikey')}
              >
                <Copy size={13} /> Copy Key
              </button>
            </div>
          )}

          {/* Table of API Keys */}
          <div className="table-wrapper" style={{ marginBottom: '24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key Prefix</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: 600
                        }}
                      >
                        <Key size={14} color="var(--accent-primary)" />
                        {k.name}
                      </div>
                    </td>
                    <td className="font-mono">{k.prefix}</td>
                    <td>{k.createdAt}</td>
                    <td>
                      <span className="badge badge-emerald">Active</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRevokeKey(k.id)}
                        style={{ color: 'var(--accent-rose)' }}
                        title="Revoke Key"
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Interactive REST API Playground Console */}
          <div
            style={{
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              marginBottom: '28px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>
              <Code2 size={16} color="var(--accent-primary)" />
              {lang === 'ar' ? 'مُجرّب الـ REST API التفاعلي (Live API Console)' : 'Interactive REST API Playground'}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                value={testMethod}
                onChange={(e) => setTestMethod(e.target.value as any)}
                style={{ width: '90px', fontWeight: 700 }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <select
                className="form-control font-mono"
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
              >
                <option value="/api/v1/proxies/pool">/api/v1/proxies/pool (List Active IPs)</option>
                <option value="/api/v1/proxies/connect">/api/v1/proxies/connect (Instant SOCKS5 Tunnel)</option>
                <option value="/api/v1/users/me">/api/v1/users/me (User Profile & Quota)</option>
                <option value="/api/v1/billing/plans">/api/v1/billing/plans (Available Subscription Tiers)</option>
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleExecuteApiTest}
                disabled={isExecutingApi}
              >
                <Play size={13} className={isExecutingApi ? 'animate-spin' : ''} />
                {isExecutingApi ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'تنفيذ الطلب' : 'Send Request')}
              </button>
            </div>

            {apiResponseJson && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>Response Output</span>
                  <span className="badge badge-emerald">
                    <CheckCircle2 size={11} /> HTTP {apiExecutionStatus} OK
                  </span>
                </div>
                <pre
                  className="font-mono"
                  style={{
                    background: 'var(--bg-input)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    color: '#34d399',
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}
                >
                  {apiResponseJson}
                </pre>
              </div>
            )}
          </div>

          {/* Code Snippets */}
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {(['curl', 'python', 'node', 'go'] as const).map((langKey) => (
                <button
                  key={langKey}
                  className={`btn btn-sm ${
                    selectedCodeLang === langKey ? 'btn-primary' : 'btn-outline'
                  }`}
                  onClick={() => setSelectedCodeLang(langKey)}
                >
                  <Terminal size={12} /> {langKey.toUpperCase()}
                </button>
              ))}
            </div>
            <pre
              className="font-mono"
              style={{
                background: 'var(--bg-input)',
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
                fontSize: '12.5px',
                color: '#38bdf8'
              }}
            >
              {codeSnippets[selectedCodeLang]}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
