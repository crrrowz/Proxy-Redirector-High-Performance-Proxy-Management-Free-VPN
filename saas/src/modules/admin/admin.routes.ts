import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('ADMIN'));

// Platform Overview
adminRouter.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeSubs = await prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const onlineRelays = await prisma.relayServer.count({ where: { status: 'ONLINE' } });
    const staticProxies = await prisma.staticProxy.count();

    return ApiResponse.success(res, {
      totalUsers,
      activeSubscriptions: activeSubs,
      onlineRelays,
      staticProxiesCount: staticProxies,
    });
  } catch (err) {
    next(err);
  }
});
