import { createHash } from 'node:crypto';

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function isValidOwnerToken(token) {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

export function ownerHash(token) {
  if (!isValidOwnerToken(token)) {
    throw new TypeError('Invalid anonymous device token');
  }
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isValidEncryptedEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.v !== 1 || typeof value.iv !== 'string' || typeof value.ciphertext !== 'string') return false;
  if (!/^[A-Za-z0-9_-]{16}$/.test(value.iv)) return false;
  if (!/^[A-Za-z0-9_-]{16,700000}$/.test(value.ciphertext)) return false;
  return Object.keys(value).every((key) => ['v', 'iv', 'ciphertext'].includes(key));
}

