import { z } from 'zod';

export const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().default('http://localhost:4000'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/proxy_redirector_saas?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-jwt-access-secret-key-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-jwt-refresh-secret-key-32-chars-long'),
  JWT_ACCESS_TTL_SEC: z.coerce.number().default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().default(604800),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  DEFAULT_BANDWIDTH_LIMIT_GB: z.coerce.number().default(50),
});

export type Config = z.infer<typeof configSchema>;
