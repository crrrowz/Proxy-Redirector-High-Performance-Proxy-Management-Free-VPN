import { UserEntity } from '../../domain/entities/user.entity.js';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: { email: string; passwordHash: string; name?: string; role?: string }): Promise<UserEntity>;
  updateRole(userId: string, role: string): Promise<void>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<void>;
  countAll(): Promise<number>;
}
