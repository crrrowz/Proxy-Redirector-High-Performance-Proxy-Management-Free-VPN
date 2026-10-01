import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { CryptoHelper } from '../../utils/crypto.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Get User Profile & Subscription
usersRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
        },
        devices: true,
        createdAt: true,
      },
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found', 'NOT_FOUND', 404);
    }

    return ApiResponse.success(res, user);
  } catch (err) {
    next(err);
  }
});

// Create API Key
usersRouter.post('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.body.name || 'Default API Key';
    const { key, prefix, hash } = CryptoHelper.generateApiKey();

    await prisma.apiKey.create({
      data: {
        userId: req.user!.userId,
        keyHash: hash,
        prefix,
        name,
      },
    });

    return ApiResponse.success(res, { key, prefix, name }, 201);
  } catch (err) {
    next(err);
  }
});

// Revoke Device
usersRouter.delete('/devices/:deviceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.params.deviceId as string;
    await prisma.device.deleteMany({
      where: {
        id: deviceId,
        userId: req.user!.userId,
      },
    });

    return ApiResponse.success(res, { message: 'Device revoked successfully' });
  } catch (err) {
    next(err);
  }
});
