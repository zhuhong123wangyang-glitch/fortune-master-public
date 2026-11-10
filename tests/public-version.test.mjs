import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(file, import.meta.url), 'utf8');

test('public workspace exposes every promised divination module', async () => {
  const html = await read('../public/index.html');
  for (const label of ['八字', '紫微斗数', '六爻', '梅花易数', '每日一签', '黄历', '双人合盘', '命盘档案']) {
    assert.ok(html.includes(label), `missing module label: ${label}`);
  }
  assert.match(html, /\/app\.js/);
  assert.match(html, /\/storage\.js/);
  assert.match(html, /profile-cloud-consent/);
});

test('browser vault encrypts cloud records and supports local backups', async () => {
  const storage = await read('../public/storage.js');
  assert.match(storage, /name: 'HKDF'/);
  assert.match(storage, /ENCRYPTION_SECRET_KEY/);
  assert.match(storage, /encryptionSecret: getEncryptionSecret\(\)/);
  assert.match(storage, /backup\.encryptionSecret/);
  assert.match(storage, /saveProfileToCloud/);
  assert.match(storage, /type: 'profile'/);
  assert.match(storage, /const publicTitle = labels\[record\.type\] \|\| '加密记录'/);
  assert.doesNotMatch(storage, /title: record\.title/);
  assert.match(storage, /name: 'AES-GCM', length: 256/);
  assert.match(storage, /localStorage/);
  assert.match(storage, /exportBackup/);
  assert.match(storage, /importBackup/);
  assert.match(storage, /Authorization/);
});

test('birth profiles stay local by default and support opt-in encrypted cloud sync', async () => {
  const profiles = await read('../public/v14.js');
  const server = await read('../server/index.js');
  assert.match(profiles, /fortune-master-public-profiles-v1/);
  assert.match(profiles, /localStorage\.setItem/);
  assert.match(profiles, /listCloudProfiles/);
  assert.match(profiles, /saveProfileToCloud/);
  assert.match(profiles, /deleteCloudProfile/);
  const html = await read('../public/index.html');
  assert.match(html, /profile-cloud-consent/);
  assert.match(server, /公网版命盘档案仅保存在当前浏览器/);
  assert.doesNotMatch(profiles, /fetch\(['"]\/api\/profiles/);
});

test('cloud API is owner-scoped and stores only encrypted envelopes', async () => {
  const server = await read('../server/index.js');
  const db = await read('../server/db.js');
  assert.match(server, /requireOwner/);
  assert.match(server, /owner_hash=\$1/);
  assert.doesNotMatch(server, /encryptionSecret/);
  assert.match(server, /isValidEncryptedEnvelope/);
  assert.match(db, /encrypted_payload JSONB NOT NULL/);
  assert.match(db, /owner_hash CHAR\(64\) NOT NULL/);
});

test('public server uses a hosted PORT and serves the health endpoint', async () => {
  const server = await read('../server/index.js');
  assert.match(server, /process\.env\.PORT/);
  assert.match(server, /app\.get\('\/api\/health'/);
  assert.match(server, /app\.listen\(PORT, '0\.0\.0\.0'/);
  assert.match(server, /scriptSrc: \["'self'"\]/);
});

test('daily-sign browser requests are authenticated by the same device token', async () => {
  const daily = await read('../public/daily.js');
  const server = await read('../server/index.js');
  assert.match(daily, /fm_device_token_v1/);
  assert.match(daily, /Authorization/);
  assert.match(server, /app\.post\('\/api\/daily-sign', requireOwner/);
});

test('Render preview provisions only the free web service and does not create paid database resources', async () => {
  const blueprint = await read('../render.yaml');
  assert.match(blueprint, /type: web/);
  assert.match(blueprint, /name: fortune-master-public/);
  assert.match(blueprint, /region: oregon/);
  assert.match(blueprint, /plan: free/);
  assert.match(blueprint, /healthCheckPath: \/api\/health/);
  assert.doesNotMatch(blueprint, /databases:|fromDatabase:|DATABASE_URL/);
});

test('public page contains no inline scripts so the same-origin CSP can block injected inline code', async () => {
  const html = await read('../public/index.html');
  const server = await read('../server/index.js');
  assert.doesNotMatch(html, /<script(?:\s[^>]*)?>\s*[^<]/i);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
  assert.match(server, /scriptSrc: \["'self'"\]/);
});

test('authentication token and encryption secret are separate; cloud API transmits only the token', async () => {
  const storage = await read('../public/storage.js');
  const apiStart = storage.indexOf('async function api(');
  const apiEnd = storage.indexOf('function loadLocal()', apiStart);
  const apiBlock = storage.slice(apiStart, apiEnd);
  assert.match(apiBlock, /getToken\(\)/);
  assert.doesNotMatch(apiBlock, /getEncryptionSecret/);
  assert.match(storage, /const publicTitle = labels\[record\.type\] \|\| '加密记录'/);
  assert.doesNotMatch(storage, /title: record\.title/);
});
