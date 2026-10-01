import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export const usageRouter = Router();

usageRouter.use(authenticate);

// Get User Bandwidth Metrics & Logs
usageRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.usageLog.findMany({
      where: { userId: req.user!.userId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const totalBytes = logs.reduce((acc, curr) => acc + Number(curr.bytesTransferred), 0);
    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    return ApiResponse.success(res, {
      totalGb,
      dailyLogs: logs,
    });
  } catch (err) {
    next(err);
  }
});
