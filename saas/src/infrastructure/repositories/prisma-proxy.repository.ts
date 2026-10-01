import { IProxyRepository } from '../../core/ports/repositories/proxy.repository.interface.js';
import { StaticProxyEntity, ProxyPoolType, ProxyTier } from '../../core/domain/entities/proxy.entity.js';
import { prisma } from '../../database/prisma.js';

export class PrismaProxyRepository implements IProxyRepository {
  async findAvailableStatic(countryCode?: string): Promise<StaticProxyEntity | null> {
    const raw = await prisma.staticProxy.findFirst({
      where: {
        isAlive: true,
        assignedUserId: null,
        ...(countryCode ? { countryCode } : {}),
      },
      orderBy: { fraudScore: 'asc' },
    });

    if (!raw) return null;
    return new StaticProxyEntity({
      ...raw,
      poolType: raw.poolType as ProxyPoolType,
      tier: raw.tier as ProxyTier,
    });
  }

  async findLeasedByUser(userId: string): Promise<StaticProxyEntity[]> {
    const rawList = await prisma.staticProxy.findMany({
      where: { assignedUserId: userId },
    });

    return rawList.map(raw => new StaticProxyEntity({
      ...raw,
      poolType: raw.poolType as ProxyPoolType,
      tier: raw.tier as ProxyTier,
    }));
  }

  async leaseProxyToUser(proxyId: string, userId: string, leaseDurationDays = 30): Promise<StaticProxyEntity> {
    const expiresAt = new Date(Date.now() + leaseDurationDays * 24 * 60 * 60 * 1000);
    const raw = await prisma.staticProxy.update({
      where: { id: proxyId },
      data: {
        assignedUserId: userId,
        assignedAt: new Date(),
        leaseExpiresAt: expiresAt,
      },
    });

    return new StaticProxyEntity({
      ...raw,
      poolType: raw.poolType as ProxyPoolType,
      tier: raw.tier as ProxyTier,
    });
  }

  async releaseLease(proxyId: string): Promise<void> {
    await prisma.staticProxy.update({
      where: { id: proxyId },
      data: {
        assignedUserId: null,
        assignedAt: null,
        leaseExpiresAt: null,
      },
    });
  }

  async updateHealth(proxyId: string, isAlive: boolean, latencyMs: number): Promise<void> {
    await prisma.staticProxy.update({
      where: { id: proxyId },
      data: {
        isAlive,
        lastLatencyMs: latencyMs,
        lastCheckedAt: new Date(),
      },
    });
  }

  async countAll(): Promise<number> {
    return prisma.staticProxy.count();
  }
}
