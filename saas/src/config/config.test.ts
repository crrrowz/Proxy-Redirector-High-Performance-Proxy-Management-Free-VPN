import test from 'node:test';
import assert from 'node:assert';
import { configSchema } from './schema.js';

test('configSchema validates valid environment variables', () => {
  const parsed = configSchema.parse({
    PORT: '5000',
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_ACCESS_SECRET: 'very-secure-jwt-access-secret-32-chars',
    JWT_REFRESH_SECRET: 'very-secure-jwt-refresh-secret-32-chars',
  });

  assert.strictEqual(parsed.PORT, 5000);
  assert.strictEqual(parsed.NODE_ENV, 'production');
  assert.strictEqual(parsed.DEFAULT_BANDWIDTH_LIMIT_GB, 50);
});

test('configSchema applies defaults for omitted non-required values', () => {
  const parsed = configSchema.parse({});
  assert.strictEqual(parsed.PORT, 4000);
  assert.strictEqual(parsed.NODE_ENV, 'development');
});
