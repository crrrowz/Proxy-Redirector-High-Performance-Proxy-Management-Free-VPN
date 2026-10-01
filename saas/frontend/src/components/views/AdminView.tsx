import React, { useState } from 'react';
import { Users, Shield, UserCheck, UserX, Server, CheckCircle2 } from 'lucide-react';
import { AdminOverview, RelayNode, StaticProxy, AdminUserItem } from '../../types';

interface AdminViewProps {
  adminStats: AdminOverview | null;
  relays: RelayNode[];
  staticProxyList: StaticProxy[];
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  adminStats,
  relays,
  staticProxyList,
  lang,
  t
}) => {
  const [userList, setUserList] = useState<AdminUserItem[]>([
    {
      id: 'usr_1',
      email: 'admin@proxyredirector.io',
      name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      planName: 'Enterprise Master',
      bandwidthUsedGb: 48.2,
      joinedAt: '2026-08-01'
    },
    {
      id: 'usr_2',
      email: 'alex.dev@datacollect.co',
      name: 'Alex Rivera',
      role: 'USER',
      status: 'ACTIVE',
      planName: 'Business Tier',
      bandwidthUsedGb: 284.1,
      joinedAt: '2026-09-10'
    },
    {
      id: 'usr_3',
      email: 'botmaster@scraperpool.net',
      name: 'Tariq Al-Mansoor',
      role: 'USER',
      status: 'SUSPENDED',
      planName: 'Pro Tier',
      bandwidthUsedGb: 198.4,
      joinedAt: '2026-09-18'
    }
  ]);

  const toggleUserStatus = (id: string) => {
    setUserList(
      userList.map((u) =>
        u.id === id
          ? {
              ...u,
              status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
            }
          : u
      )
    );
  };

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Users</span>
            <span className="badge badge-blue">Registered</span>
          </div>
          <div className="metric-value">{adminStats?.totalUsers || userList.length}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Subscriptions</span>
            <span className="badge badge-emerald">Billing</span>
          </div>
          <div className="metric-value">{adminStats?.activeSubscriptions || 2}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Online Relays</span>
            <span className="badge badge-emerald">Healthy</span>
          </div>
          <div className="metric-value">{adminStats?.onlineRelays || relays.length}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Static Proxies In Pool</span>
            <span className="badge badge-blue">Inventory</span>
          </div>
          <div className="metric-value">
            {adminStats?.staticProxiesCount || staticProxyList.length}
          </div>
        </div>
      </div>

      {/* User Management Ledger */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--accent-primary)" />
            {lang === 'ar' ? 'إدارة المستخدمين وحسابات المشتركين' : 'Enterprise User & Access Management'}
          </div>
          <span className="badge badge-emerald">Admin Session Active</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Role</th>
                <th>Active Plan</th>
                <th>Bandwidth (GB)</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                      {u.role === 'ADMIN' ? <Shield size={11} /> : <UserCheck size={11} />} {u.role}
                    </span>
                  </td>
                  <td>{u.planName}</td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{u.bandwidthUsedGb} GB</td>
                  <td>
                    <span className={`badge ${u.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                      {u.status === 'ACTIVE' ? <CheckCircle2 size={11} /> : <UserX size={11} />} {u.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.joinedAt}</td>
                  <td>
                    {u.role !== 'ADMIN' && (
                      <button
                        className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => toggleUserStatus(u.id)}
                        style={u.status === 'ACTIVE' ? { color: 'var(--accent-rose)' } : {}}
                      >
                        {u.status === 'ACTIVE' ? (lang === 'ar' ? 'حظر' : 'Suspend') : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} color="var(--accent-emerald)" />
            {t.adminTitle}
          </div>
        </div>
        <div className="panel-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7 }}>
            {lang === 'ar'
              ? 'جميع العقد وقواعد البيانات وقنوات Redis تعمل بكفاءة تامة. يمكنك إضافة خوادم Relay جديدة أو توسيع مخزون الـ IP عبر الـ REST API.'
              : 'All fleet nodes, database connections, and background workers are operating normally.'}
          </p>
        </div>
      </div>
    </div>
  );
};
