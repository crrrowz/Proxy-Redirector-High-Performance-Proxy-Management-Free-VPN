import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  fingerprint: z.string().optional(),
  deviceName: z.string().optional(),
  deviceOs: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
