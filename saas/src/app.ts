import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestIdMiddleware } from './presentation/middlewares/request-id.middleware.js';
import { idempotencyGuard } from './presentation/middlewares/idempotency.middleware.js';
import { rfc7807ErrorHandler } from './presentation/middlewares/rfc7807-error.middleware.js';

import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { proxiesRouter } from './modules/proxies/proxies.routes.js';
import { relaysRouter } from './modules/relays/relays.routes.js';
import { usageRouter } from './modules/usage/usage.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';

export function createApp() {
  const app = express();

  // Core Security & Ingress Middlewares
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(idempotencyGuard(86400));

  // Health Check Probe
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'proxy-redirector-saas',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    });
  });

  // REST API v1 Routing
  const apiV1 = express.Router();
  apiV1.use('/auth', authRouter);
  apiV1.use('/users', usersRouter);
  apiV1.use('/billing', billingRouter);
  apiV1.use('/proxies', proxiesRouter);
  apiV1.use('/relays', relaysRouter);
  apiV1.use('/usage', usageRouter);
  apiV1.use('/admin', adminRouter);

  app.use('/api/v1', apiV1);

  // RFC 7807 Enterprise Error Handler
  app.use(rfc7807ErrorHandler);

  return app;
}
