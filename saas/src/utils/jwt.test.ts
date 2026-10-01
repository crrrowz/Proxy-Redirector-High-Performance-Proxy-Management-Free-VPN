import test from 'node:test';
import assert from 'node:assert';
import { JwtHelper } from './jwt.js';

test('JwtHelper signs and verifies access tokens', () => {
  const payload = {
    userId: 'usr_12345',
    email: 'user@example.com',
    role: 'PRO_USER',
  };

  const token = JwtHelper.signAccessToken(payload);
  assert.ok(typeof token === 'string', 'Token should be a string');

  const decoded = JwtHelper.verifyAccessToken(token);
  assert.strictEqual(decoded.userId, payload.userId);
  assert.strictEqual(decoded.email, payload.email);
  assert.strictEqual(decoded.role, payload.role);
});

test('JwtHelper signs refresh token with unique jti', () => {
  const payload = {
    userId: 'usr_999',
    email: 'test@example.com',
    role: 'USER',
  };

  const token = JwtHelper.signRefreshToken(payload);
  const decoded = JwtHelper.verifyRefreshToken(token);

  assert.strictEqual(decoded.userId, payload.userId);
  assert.ok(decoded.jti, 'Refresh token must contain unique jti UUID');
});
