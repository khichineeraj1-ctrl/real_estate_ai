import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.ADMIN_EMAIL = 'Admin@Example.com';
process.env.ADMIN_PASSWORD = 'correct horse';

test('login, tokens and expiry', async () => {
  const { checkLogin, issueToken, verifyToken } = await import('./auth');
  assert.equal(checkLogin(' admin@example.com ', 'correct horse'), true);
  assert.equal(checkLogin('admin@example.com', 'wrong'), false);
  assert.equal(checkLogin('other@example.com', 'correct horse'), false);

  const t = issueToken(1_000);
  assert.equal(verifyToken(t, 2_000), true);
  assert.equal(verifyToken(t, 1_000 + 13 * 3_600_000), false, 'expired');
  assert.equal(verifyToken(undefined), false);
  assert.equal(verifyToken('garbage'), false);
  // A token whose expiry was edited no longer matches its signature.
  const forged = `${Buffer.from(JSON.stringify({ exp: 9e15 })).toString('base64url')}.${t.split('.')[1]}`;
  assert.equal(verifyToken(forged, 2_000), false);
});
