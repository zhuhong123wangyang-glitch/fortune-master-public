import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SignbookStore } from '../src/signs/store.mjs';
import { DailySignService } from '../src/signs/service.mjs';
import { getSign } from '../src/signs/catalog.mjs';

test('daily signbook backup restores canonical sign details and is idempotent', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'fortune-signbook-restore-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new SignbookStore(join(dir, 'signbook.json'));
  const service = new DailySignService(store, () => 26, () => new Date('2026-11-11T03:00:00.000Z'));
  const sign = getSign(26);
  const backupItem = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    kind: 'daily',
    date: '2026-11-11',
    timezone: 'Asia/Shanghai',
    drawnAt: '2026-11-11T03:00:00.000Z',
    signId: 26,
    title: sign.title,
    grade: sign.grade,
    theme: sign.theme,
    lines: sign.lines,
    favorite: true,
    topic: 'general',
    storedQuestion: ''
  };

  assert.deepEqual(
    await service.restoreHistory({ profileId: 'a'.repeat(64), items: [backupItem] }),
    { imported: 1, skipped: 0 }
  );
  assert.deepEqual(
    await service.restoreHistory({ profileId: 'a'.repeat(64), items: [backupItem] }),
    { imported: 0, skipped: 1 }
  );

  const history = await service.history({ profileId: 'a'.repeat(64) });
  assert.equal(history.total, 1);
  assert.equal(history.items[0].title, sign.title);
  assert.equal(history.items[0].favorite, true);
  assert.equal(history.persistent, false);
});

test('daily signbook backup rejects altered sign text and invalid dates', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'fortune-signbook-invalid-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const service = new DailySignService(new SignbookStore(join(dir, 'signbook.json')));
  const sign = getSign(26);
  const item = {
    id: '123e4567-e89b-42d3-a456-426614174001',
    kind: 'daily',
    date: '2026-11-11',
    timezone: 'Asia/Shanghai',
    drawnAt: '2026-11-11T03:00:00.000Z',
    signId: 26,
    title: sign.title,
    grade: sign.grade,
    lines: sign.lines,
    topic: 'general'
  };
  await assert.rejects(
    service.restoreHistory({ profileId: 'a'.repeat(64), items: [{ ...item, title: '伪造签名' }] }),
    /签文与当前原创签库不匹配/
  );
  await assert.rejects(
    service.restoreHistory({ profileId: 'a'.repeat(64), items: [{ ...item, date: '2026-02-31' }] }),
    /备份日期无效/
  );
});
