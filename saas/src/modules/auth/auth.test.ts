import { test } from 'node:test';
import assert from 'node:assert';
import { registerSchema, loginSchema } from './auth.schema.js';

test('authSchema validates user registration inputs', () => {
  const valid = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'Password123!',
    name: 'Test Engineer',
  });
  assert.strictEqual(valid.success, true);

  const invalidEmail = registerSchema.safeParse({
    email: 'not-an-email',
    password: 'Password123!',
  });
  assert.strictEqual(invalidEmail.success, false);

  const shortPassword = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'short',
  });
  assert.strictEqual(shortPassword.success, false);
});

test('loginSchema requires valid email and non-empty password', () => {
  const valid = loginSchema.safeParse({
    email: 'admin@proxyredirector.io',
    password: 'AdminSecret123!',
  });
  assert.strictEqual(valid.success, true);

  const missingPassword = loginSchema.safeParse({
    email: 'admin@proxyredirector.io',
  });
  assert.strictEqual(missingPassword.success, false);
});
