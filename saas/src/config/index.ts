import dotenv from 'dotenv';
import { configSchema, Config } from './schema.js';

dotenv.config();

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
