export type ProxyPoolType = 'STATIC_DEDICATED' | 'STATIC_SHARED' | 'DYNAMIC_ROTATING';
export type ProxyTier = 'TIER_1_PRIVATE_VPS' | 'TIER_2_STATIC_ISP' | 'TIER_3_STATIC_DATACENTER';

export interface StaticProxyProps {
  id: string;
  ip: string;
  port: number;
  protocol: string;
  username?: string | null;
  password?: string | null;
  poolType: ProxyPoolType;
  tier: ProxyTier;
  providerName: string;
  countryCode: string;
  city?: string | null;
  asn?: number | null;
  ispName?: string | null;
  fraudScore: number;
  isAlive: boolean;
  lastLatencyMs: number;
  uptimePercent: number;
  consecutiveFails: number;
  assignedUserId?: string | null;
  assignedAt?: Date | null;
  leaseExpiresAt?: Date | null;
  lastCheckedAt: Date;
}

export class StaticProxyEntity {
  constructor(public readonly props: StaticProxyProps) {}

  get id(): string { return this.props.id; }
  get ip(): string { return this.props.ip; }
  get port(): number { return this.props.port; }
  get isAlive(): boolean { return this.props.isAlive; }
  get isDedicated(): boolean { return this.props.poolType === 'STATIC_DEDICATED'; }
  get isLeased(): boolean { return Boolean(this.props.assignedUserId); }

  isCleanForVIP(): boolean {
    return this.props.fraudScore <= 15 && this.props.isAlive;
  }
}
