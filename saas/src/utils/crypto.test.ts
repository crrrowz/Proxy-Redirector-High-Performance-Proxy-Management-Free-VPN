import test from 'node:test';
import assert from 'node:assert';
import { CryptoHelper } from './crypto.js';

test('CryptoHelper hashes and verifies passwords correctly', async () => {
  const plain = 'SecretPassword123!';
  const hash = await CryptoHelper.hashPassword(plain);

  assert.ok(hash !== plain, 'Hash should not match plaintext');
  const valid = await CryptoHelper.comparePassword(plain, hash);
  assert.strictEqual(valid, true, 'Password verification should succeed');

  const invalid = await CryptoHelper.comparePassword('WrongPassword', hash);
  assert.strictEqual(invalid, false, 'Invalid password should fail verification');
});

test('CryptoHelper generates and hashes API keys', () => {
  const { key, prefix, hash } = CryptoHelper.generateApiKey();

  assert.ok(key.startsWith('prk_'), 'API key should start with prk_');
  assert.strictEqual(key.slice(0, 10), prefix, 'Prefix should match start of key');
  assert.ok(hash.length === 64, 'SHA-256 hash length should be 64 hex chars');

  const computedHash = CryptoHelper.hashKey(key);
  assert.strictEqual(computedHash, hash, 'Computed hash must match generated hash');
});
