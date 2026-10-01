import test from 'node:test';
import assert from 'node:assert';
import { LeaseStaticProxyUseCase } from './lease-static-proxy.use-case.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import { StaticProxyEntity } from '../../domain/entities/proxy.entity.js';
import { ForbiddenException, NotFoundException } from '../../domain/exceptions/domain.exceptions.js';
import { IProxyRepository } from '../../ports/repositories/proxy.repository.interface.js';
import { IUserRepository } from '../../ports/repositories/user.repository.interface.js';

test('LeaseStaticProxyUseCase assigns clean proxy to Pro user', async () => {
  const mockUser = new UserEntity({
    id: 'user_pro_1',
    email: 'pro@test.com',
    passwordHash: 'hash',
    role: 'PRO_USER',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockProxy = new StaticProxyEntity({
    id: 'proxy_1',
    ip: '198.51.100.10',
    port: 1080,
    protocol: 'socks5',
    poolType: 'STATIC_DEDICATED',
    tier: 'TIER_2_STATIC_ISP',
    providerName: 'Test ISP',
    countryCode: 'US',
    fraudScore: 0,
    isAlive: true,
    lastLatencyMs: 25.0,
    uptimePercent: 100.0,
    consecutiveFails: 0,
    lastCheckedAt: new Date(),
  });

  const mockUserRepo: IUserRepository = {
    findById: async (id: string) => (id === mockUser.id ? mockUser : null),
    findByEmail: async () => null,
    create: async () => mockUser,
    updateRole: async () => {},
    updateStripeCustomerId: async () => {},
    countAll: async () => 1,
  };

  const mockProxyRepo: IProxyRepository = {
    findAvailableStatic: async () => mockProxy,
    findLeasedByUser: async () => [],
    leaseProxyToUser: async (proxyId, userId) => {
      return new StaticProxyEntity({
        ...mockProxy.props,
        assignedUserId: userId,
        assignedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 30 * 86400000),
      });
    },
    releaseLease: async () => {},
    updateHealth: async () => {},
    countAll: async () => 1,
  };

  const useCase = new LeaseStaticProxyUseCase(mockProxyRepo, mockUserRepo);
  const result = await useCase.execute(mockUser.id, 'US');

  assert.strictEqual(result.proxyId, 'proxy_1');
  assert.strictEqual(result.ip, '198.51.100.10');
  assert.strictEqual(result.country, 'US');
  assert.ok(result.leaseExpiresAt, 'Lease expiration date should be set');
});

test('LeaseStaticProxyUseCase rejects regular Free users', async () => {
  const mockFreeUser = new UserEntity({
    id: 'user_free_1',
    email: 'free@test.com',
    passwordHash: 'hash',
    role: 'USER',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockUserRepo: IUserRepository = {
    findById: async () => mockFreeUser,
    findByEmail: async () => null,
    create: async () => mockFreeUser,
    updateRole: async () => {},
    updateStripeCustomerId: async () => {},
    countAll: async () => 1,
  };

  const mockProxyRepo: IProxyRepository = {
    findAvailableStatic: async () => null,
    findLeasedByUser: async () => [],
    leaseProxyToUser: async () => ({} as any),
    releaseLease: async () => {},
    updateHealth: async () => {},
    countAll: async () => 0,
  };

  const useCase = new LeaseStaticProxyUseCase(mockProxyRepo, mockUserRepo);

  await assert.rejects(
    async () => useCase.execute(mockFreeUser.id, 'US'),
    (err: any) => err instanceof ForbiddenException,
    'Should throw ForbiddenException for non-Pro users',
  );
});
