import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.js';
import { ApiResponse } from '../../utils/apiResponse.js';

export const relaysRouter = Router();

// Relay Heartbeat from Go Engine Node
relaysRouter.post('/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicIp, currentLoad, activeSessions, status } = req.body;

    if (!publicIp) {
      return ApiResponse.error(res, 'Missing publicIp', 'BAD_REQUEST', 400);
    }

    const relay = await prisma.relayServer.upsert({
      where: { publicIp },
      update: {
        lastHeartbeat: new Date(),
        currentLoad: currentLoad || 0.0,
        activeSessions: activeSessions || 0,
        status: status || 'ONLINE',
      },
      create: {
        name: `relay-${publicIp.replace(/\./g, '-')}`,
        publicIp,
        region: req.body.region || 'US-East',
        country: req.body.country || 'US',
        secretKeyHash: 'none',
        status: 'ONLINE',
      },
    });

    return ApiResponse.success(res, { ok: true, relayId: relay.id });
  } catch (err) {
    next(err);
  }
});
