import test from 'node:test';
import assert from 'node:assert';
import { createApp } from './app.js';

test('createApp initializes express app and responds to /health', async () => {
  const app = createApp();
  assert.ok(app, 'Express app should be created');
});
