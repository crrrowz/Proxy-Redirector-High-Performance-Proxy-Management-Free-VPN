export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  subscriptions?: Array<{
    id: string;
    status: string;
    plan: {
      name: string;
      bandwidthLimitGb: number;
      priceMonthly: number;
    };
  }>;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  bandwidthLimitGb: number;
  maxDevices: number;
  allowedRegions: string[];
  hasAdBlock: boolean;
  hasDedicatedIps: boolean;
}

export interface StaticProxy {
  id: string;
  ip: string;
  port: number;
  protocol: string;
  countryCode: string;
  city: string;
  ispName: string;
  fraudScore: number;
  lastLatencyMs: number;
  uptimePercent: number;
  isAlive: boolean;
}

export interface RelayNode {
  id: string;
  name: string;
  region: string;
  ip: string;
  grpcPort: number;
  socksPort: number;
  loadPercent: number;
  latencyMs: number;
  status: 'healthy' | 'degraded' | 'offline';
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  key?: string;
  createdAt: string;
  expiresAt?: string | null;
}

export interface DeviceItem {
  id: string;
  deviceName: string;
  deviceOs: string;
  lastIp: string;
  lastActive: string;
  isCurrent?: boolean;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
  planName: string;
  downloadUrl?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  planName: string;
  bandwidthUsedGb: number;
  joinedAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  activeSubscriptions: number;
  onlineRelays: number;
  staticProxiesCount: number;
}
