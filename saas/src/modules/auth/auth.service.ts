import { prisma } from '../../database/prisma.js';
import { CryptoHelper } from '../../utils/crypto.js';
import { JwtHelper } from '../../utils/jwt.js';

export class AuthService {
  static async register(email: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await CryptoHelper.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'USER',
      },
    });

    const accessToken = JwtHelper.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = JwtHelper.signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  }

  static async login(email: string, password: string, deviceMeta?: { fingerprint?: string; deviceName?: string; deviceOs?: string }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await CryptoHelper.comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    // Upsert device if fingerprint provided
    if (deviceMeta?.fingerprint) {
      await prisma.device.upsert({
        where: {
          userId_fingerprint: {
            userId: user.id,
            fingerprint: deviceMeta.fingerprint,
          },
        },
        update: {
          lastActive: new Date(),
          deviceName: deviceMeta.deviceName || 'Unknown Device',
          deviceOs: deviceMeta.deviceOs || 'Unknown OS',
        },
        create: {
          userId: user.id,
          fingerprint: deviceMeta.fingerprint,
          deviceName: deviceMeta.deviceName || 'Unknown Device',
          deviceOs: deviceMeta.deviceOs || 'Unknown OS',
        },
      });
    }

    const accessToken = JwtHelper.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = JwtHelper.signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(refreshToken: string) {
    const payload = JwtHelper.verifyRefreshToken(refreshToken);
    const isRevoked = await JwtHelper.isTokenRevoked(payload.jti);
    if (isRevoked) {
      throw new Error('Token has been revoked');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Revoke old token and mint fresh tokens
    if (payload.jti) {
      await JwtHelper.revokeRefreshToken(payload.jti);
    }

    const newAccessToken = JwtHelper.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = JwtHelper.signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(refreshToken: string) {
    try {
      const payload = JwtHelper.verifyRefreshToken(refreshToken);
      if (payload.jti) {
        await JwtHelper.revokeRefreshToken(payload.jti);
      }
    } catch {
      // ignore
    }
  }
}
