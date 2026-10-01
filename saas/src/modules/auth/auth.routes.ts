import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../middlewares/validate.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js';
import { rateLimiter } from '../../middlewares/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/register', rateLimiter(20, 60), validateBody(registerSchema), AuthController.register);
authRouter.post('/login', rateLimiter(30, 60), validateBody(loginSchema), AuthController.login);
authRouter.post('/refresh', rateLimiter(60, 60), validateBody(refreshSchema), AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
