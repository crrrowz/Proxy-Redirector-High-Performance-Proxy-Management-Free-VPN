import React, { useState } from 'react';
import { Smartphone, Laptop, Trash2, CheckCircle2, Shield } from 'lucide-react';
import { DeviceItem } from '../../types';

interface DevicesViewProps {
  showToast: (msg: string) => void;
  lang: 'ar' | 'en';
}

export const DevicesView: React.FC<DevicesViewProps> = ({ showToast, lang }) => {
  const [devices, setDevices] = useState<DeviceItem[]>([
    {
      id: 'dev_1',
      deviceName: 'Workstation Chrome (Primary)',
      deviceOs: 'Windows 11 x64',
      lastIp: '198.51.100.15',
      lastActive: 'Just now',
      isCurrent: true
    },
    {
      id: 'dev_2',
      deviceName: 'MacBook Pro Scraper Daemon',
      deviceOs: 'macOS Sonoma (ARM64)',
      lastIp: '198.51.100.44',
      lastActive: '12 mins ago',
      isCurrent: false
    },
    {
      id: 'dev_3',
      deviceName: 'Ubuntu Headless Relay Bot',
      deviceOs: 'Ubuntu 24.04 LTS',
      lastIp: '198.51.100.89',
      lastActive: '1 hour ago',
      isCurrent: false
    }
  ]);

  const handleRevokeDevice = (id: string) => {
    setDevices(devices.filter((d) => d.id !== id));
    showToast(
      lang === 'ar' ? 'تم تسجيل خروج الجهاز وإنهاء جلسته' : 'Device session revoked'
    );
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            {lang === 'ar'
              ? 'إدارة الأجهزة والجلسات المصرح لها'
              : 'Authorized Devices & Active Sessions'}
          </div>
          <span className="badge badge-emerald">
            <Shield size={13} /> {devices.length} Devices Active
          </span>
        </div>
        <div className="panel-body">
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '13.5px',
              marginBottom: '20px'
            }}
          >
            {lang === 'ar'
              ? 'يمكنك مراقبة جميع الأجهزة المصرح لها باستخدام حصتك الشهرية من الباندويث وإلغاء أي جلسة مشبوهة بضغطة زر.'
              : 'Monitor and revoke authorized devices connected to your residential proxy network and relay slots.'}
          </p>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device / Client</th>
                  <th>Operating System</th>
                  <th>Last IP Address</th>
                  <th>Last Activity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((dev) => (
                  <tr key={dev.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontWeight: 600
                        }}
                      >
                        {dev.deviceOs.includes('macOS') || dev.deviceOs.includes('Ubuntu') ? (
                          <Laptop size={16} color="var(--accent-primary)" />
                        ) : (
                          <Smartphone size={16} color="var(--accent-emerald)" />
                        )}
                        {dev.deviceName}
                      </div>
                    </td>
                    <td>{dev.deviceOs}</td>
                    <td className="font-mono">{dev.lastIp}</td>
                    <td>{dev.lastActive}</td>
                    <td>
                      {dev.isCurrent ? (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> Current Device
                        </span>
                      ) : (
                        <span className="badge badge-blue">Authorized</span>
                      )}
                    </td>
                    <td>
                      {dev.isCurrent ? (
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)'
                          }}
                        >
                          Active
                        </span>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleRevokeDevice(dev.id)}
                          style={{ color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={13} /> Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
