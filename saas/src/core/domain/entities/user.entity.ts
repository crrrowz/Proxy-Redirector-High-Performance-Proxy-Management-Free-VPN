export type UserRole = 'USER' | 'PRO_USER' | 'ENTERPRISE' | 'ADMIN' | 'SUPPORT';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  name?: string | null;
  role: UserRole;
  emailVerified: boolean;
  stripeCustomerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  constructor(public readonly props: UserProps) {}

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get role(): UserRole { return this.props.role; }
  get passwordHash(): string { return this.props.passwordHash; }

  hasAccessToTier(minRole: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      USER: 1,
      PRO_USER: 2,
      ENTERPRISE: 3,
      SUPPORT: 4,
      ADMIN: 5,
    };
    return hierarchy[this.role] >= hierarchy[minRole];
  }
}
