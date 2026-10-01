import { IUserRepository } from '../../core/ports/repositories/user.repository.interface.js';
import { UserEntity, UserRole } from '../../core/domain/entities/user.entity.js';
import { prisma } from '../../database/prisma.js';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const raw = await prisma.user.findUnique({ where: { id } });
    if (!raw) return null;
    return new UserEntity({ ...raw, role: raw.role as UserRole });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const raw = await prisma.user.findUnique({ where: { email } });
    if (!raw) return null;
    return new UserEntity({ ...raw, role: raw.role as UserRole });
  }

  async create(user: { email: string; passwordHash: string; name?: string; role?: string }): Promise<UserEntity> {
    const raw = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: (user.role as any) || 'USER',
      },
    });
    return new UserEntity({ ...raw, role: raw.role as UserRole });
  }

  async updateRole(userId: string, role: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });
  }

  async updateStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  async countAll(): Promise<number> {
    return prisma.user.count();
  }
}
