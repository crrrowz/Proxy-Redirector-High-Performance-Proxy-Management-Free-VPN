import { IProxyRepository } from '../../ports/repositories/proxy.repository.interface.js';
import { IUserRepository } from '../../ports/repositories/user.repository.interface.js';
import { NotFoundException, ForbiddenException } from '../../domain/exceptions/domain.exceptions.js';

export class LeaseStaticProxyUseCase {
  constructor(
    private readonly proxyRepo: IProxyRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, countryCode?: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // Check tier access
    if (!user.hasAccessToTier('PRO_USER')) {
      throw new ForbiddenException('Dedicated static proxies require Pro or Enterprise subscription');
    }

    const available = await this.proxyRepo.findAvailableStatic(countryCode);
    if (!available) {
      throw new NotFoundException('No clean static proxies available for assignment in this country');
    }

    const leased = await this.proxyRepo.leaseProxyToUser(available.id, userId);
    return {
      proxyId: leased.id,
      ip: leased.ip,
      port: leased.port,
      protocol: leased.props.protocol,
      country: leased.props.countryCode,
      tier: leased.props.tier,
      leaseExpiresAt: leased.props.leaseExpiresAt,
    };
  }
}
