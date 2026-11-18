import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, issueToken, normalEmail, readToken, verifyPassword } from './auth';

test('passwords are hashed with a fresh salt and verified', () => {
  const a = hashPassword('correct horse');
  assert.notEqual(a, hashPassword('correct horse'));
  assert.ok(!a.includes('correct horse'));
  assert.equal(verifyPassword('correct horse', a), true);
  assert.equal(verifyPassword('wrong', a), false);
  assert.equal(verifyPassword('correct horse', 'not-a-hash'), false);
  assert.equal(normalEmail(' Admin@Example.com '), 'admin@example.com');
});

test('tokens carry the user, expire, and cannot be forged', () => {
  const t = issueToken('user_1', 1_000);
  assert.equal(readToken(t, 2_000), 'user_1');
  assert.equal(readToken(t, 1_000 + 13 * 3_600_000), null, 'expired');
  assert.equal(readToken(undefined), null);
  assert.equal(readToken('garbage'), null);
  // A token rewritten to name another user no longer matches its signature.
  const forged = `${Buffer.from(JSON.stringify({ sub: 'user_2', exp: 9e15 })).toString('base64url')}.${t.split('.')[1]}`;
  assert.equal(readToken(forged, 2_000), null);
});
