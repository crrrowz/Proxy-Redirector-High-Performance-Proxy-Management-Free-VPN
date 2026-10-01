import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import crypto from 'crypto';

export const proxiesRouter = Router();

proxiesRouter.use(authenticate);

// List Available Regions
proxiesRouter.get('/regions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relays = await prisma.relayServer.findMany({
      where: { status: 'ONLINE' },
      select: { region: true, country: true },
      distinct: ['region'],
    });

    return ApiResponse.success(res, relays);
  } catch (err) {
    next(err);
  }
});

// Connect to Cloud Relay & Issue Session Token
proxiesRouter.post('/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region } = req.body;

    // Find best relay server in region
    const relay = await prisma.relayServer.findFirst({
      where: {
        status: 'ONLINE',
        ...(region ? { region } : {}),
      },
      orderBy: { currentLoad: 'asc' },
    });

    if (!relay) {
      return ApiResponse.error(res, 'No online relay servers available in this region', 'RELAYS_UNAVAILABLE', 503);
    }

    const sessionToken = `ses_${crypto.randomBytes(20).toString('hex')}`;
    const session = await prisma.proxySession.create({
      data: {
        userId: req.user!.userId,
        relayId: relay.id,
        sessionToken,
        clientIp: req.ip || '127.0.0.1',
      },
    });

    return ApiResponse.success(res, {
      relay: {
        id: relay.id,
        name: relay.name,
        region: relay.region,
        publicIp: relay.publicIp,
        socksPort: relay.socksPort,
        httpPort: relay.httpPort,
      },
      sessionToken,
      sessionId: session.id,
    });
  } catch (err) {
    next(err);
  }
});

// Dedicated Static Proxies list for User
proxiesRouter.get('/static', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staticProxies = await prisma.staticProxy.findMany({
      where: { assignedUserId: req.user!.userId, isAlive: true },
    });

    return ApiResponse.success(res, staticProxies);
  } catch (err) {
    next(err);
  }
});
