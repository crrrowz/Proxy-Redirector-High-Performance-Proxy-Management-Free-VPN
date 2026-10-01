import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export const billingRouter = Router();

// Public: Get Available Plans
billingRouter.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    return ApiResponse.success(res, plans);
  } catch (err) {
    next(err);
  }
});

// Authenticated: Create Checkout Session (Stripe Mock / Integration)
billingRouter.post('/checkout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return ApiResponse.error(res, 'Plan not found', 'PLAN_NOT_FOUND', 404);
    }

    // In local/test mode, directly attach or upgrade subscription
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.user!.userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd,
      },
    });

    // Upgrade user role if Pro
    if (plan.name.toLowerCase().includes('pro')) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { role: 'PRO_USER' },
      });
    }

    return ApiResponse.success(res, {
      subscription,
      checkoutUrl: `https://checkout.stripe.com/pay/mock_session_${subscription.id}`,
    });
  } catch (err) {
    next(err);
  }
});
