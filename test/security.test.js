import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEncryptedEnvelope, isValidOwnerToken, ownerHash } from '../server/security.js';

const token = 'A'.repeat(43);

test('accepts only a 43-character base64url device token', () => {
  assert.equal(token.length, 43);
  assert.equal(isValidOwnerToken(token), true);
  assert.equal(isValidOwnerToken('short'), false);
  assert.equal(isValidOwnerToken(`${token}!`), false);
  assert.throws(() => ownerHash('short'), TypeError);
});

test('hashes the same device token deterministically without storing it directly', () => {
  const hash = ownerHash(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(ownerHash(token), hash);
});

test('accepts the browser encrypted payload envelope', () => {
  assert.equal(isValidEncryptedEnvelope({ v: 1, iv: 'AAAAAAAAAAAAAAAA', ciphertext: 'AAAAAAAAAAAAAAAA' }), true);
  assert.equal(isValidEncryptedEnvelope({ v: 1, iv: 'short', ciphertext: 'AAAAAAAAAAAAAAAA' }), false);
  assert.equal(isValidEncryptedEnvelope({ v: 2, iv: 'AAAAAAAAAAAAAAAA', ciphertext: 'AAAAAAAAAAAAAAAA' }), false);
  assert.equal(isValidEncryptedEnvelope(['not', 'an', 'object']), false);
});
