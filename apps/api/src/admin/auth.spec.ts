import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailSecret, hashEmailSecret, hashPassword, issueToken, normalEmail, passwordKey, readToken, verifyPassword } from './auth';

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
  const user = { id: 'user_1', passwordHash: hashPassword('first password') };
  const t = issueToken(user, 1_000);
  assert.deepEqual(readToken(t, 2_000), { sub: 'user_1', k: passwordKey(user.passwordHash) });
  // After a password change the fingerprint in old sessions no longer matches the account.
  assert.notEqual(readToken(t, 2_000)?.k, passwordKey(hashPassword('second password')));
  assert.equal(readToken(t, 1_000 + 13 * 3_600_000), null, 'expired');
  assert.equal(readToken(undefined), null);
  assert.equal(readToken('garbage'), null);
  // A token rewritten to name another user no longer matches its signature.
  const forged = `${Buffer.from(JSON.stringify({ sub: 'user_2', exp: 9e15 })).toString('base64url')}.${t.split('.')[1]}`;
  assert.equal(readToken(forged, 2_000), null);
});

test('email link secrets are random and stored only as a hash', () => {
  const a = emailSecret();
  assert.notEqual(a.secret, emailSecret().secret);
  assert.equal(hashEmailSecret(a.secret), a.hash);
  assert.ok(!a.hash.includes(a.secret));
});
