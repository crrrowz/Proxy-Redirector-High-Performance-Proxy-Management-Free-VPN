import { StaticProxyEntity } from '../../domain/entities/proxy.entity.js';

export interface IProxyRepository {
  findAvailableStatic(countryCode?: string): Promise<StaticProxyEntity | null>;
  findLeasedByUser(userId: string): Promise<StaticProxyEntity[]>;
  leaseProxyToUser(proxyId: string, userId: string, leaseDurationDays?: number): Promise<StaticProxyEntity>;
  releaseLease(proxyId: string): Promise<void>;
  updateHealth(proxyId: string, isAlive: boolean, latencyMs: number): Promise<void>;
  countAll(): Promise<number>;
}
