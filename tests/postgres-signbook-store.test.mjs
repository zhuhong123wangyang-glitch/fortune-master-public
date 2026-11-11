import test from 'node:test';
import assert from 'node:assert/strict';
import { PostgresSignbookStore } from '../server/postgres-signbook-store.js';

class FakePool {
  rows = [];

  async query(sql, values = []) {
    if (sql.includes('SELECT COUNT(*)::int AS total FROM daily_sign_records')) {
      const owner = values[0];
      let rows = this.rows.filter(x => x.owner_hash === owner);
      if (sql.includes('record_kind = $2')) rows = rows.filter(x => x.record_kind === values[1]);
      if (sql.includes('sign_date >= $')) {
        const month = values.find(x => typeof x === 'string' && /^\\d{4}-\\d{2}-01$/.test(x));
        if (month) rows = rows.filter(x => x.sign_date.startsWith(month.slice(0, 7)));
      }
      return { rowCount: 1, rows: [{ total: rows.length }] };
    }

    if (sql.includes('INSERT INTO daily_sign_records')) {
      const [id, owner_hash, record_kind, sign_date, timezone, drawn_at, sign, system_id, system_version, topic, question] = values;
      if (record_kind === 'daily' && this.rows.some(x => x.owner_hash === owner_hash && x.record_kind === 'daily' && x.sign_date === sign_date)) {
        return { rowCount: 0, rows: [] };
      }
      const row = {
        id, owner_hash, record_kind, sign_date, timezone, drawn_at,
        sign: JSON.parse(sign), system_id, system_version, topic, question, favorite: false
      };
      this.rows.push(row);
      return { rowCount: 1, rows: [row] };
    }

    if (sql.includes('UPDATE daily_sign_records SET favorite')) {
      const [owner, id] = values;
      const row = this.rows.find(x => x.owner_hash === owner && x.id === id);
      if (!row) return { rowCount: 0, rows: [] };
      row.favorite = !row.favorite;
      return { rowCount: 1, rows: [row] };
    }

    if (sql.includes('DELETE FROM daily_sign_records')) {
      const [owner, id] = values;
      const before = this.rows.length;
      this.rows = this.rows.filter(x => !(x.owner_hash === owner && (!id || x.id === id)));
      const removed = before - this.rows.length;
      return { rowCount: removed, rows: Array.from({length: removed}, (_, i) => ({ id: String(i) })) };
    }

    if (sql.includes('SELECT') && sql.includes('FROM daily_sign_records')) {
      let rows = this.rows;
      if (sql.includes('owner_hash = $1')) rows = rows.filter(x => x.owner_hash === values[0]);
      if (sql.includes("record_kind = 'daily'")) rows = rows.filter(x => x.record_kind === 'daily');
      if (sql.includes('sign_date = $2')) rows = rows.filter(x => x.sign_date === values[1]);
      if (sql.includes('id = $2')) rows = rows.filter(x => x.id === values[1]);
      if (sql.includes('ORDER BY drawn_at DESC')) rows = [...rows].sort((a, b) => b.drawn_at.localeCompare(a.drawn_at));
      if (sql.includes('LIMIT $')) {
        const limit = values[values.length - 2];
        const offset = values[values.length - 1];
        if (Number.isInteger(limit) && Number.isInteger(offset)) rows = rows.slice(offset, offset + limit);
        else rows = rows.slice(0, 1);
      }
      return { rowCount: rows.length, rows };
    }

    throw new Error('Unexpected SQL in FakePool: ' + sql);
  }
}

const sign = { id: 26, title: '柳岸新晴', grade: '上吉', theme: '行动', lines: ['柳岸初晴舟可渡', '人间好景趁春行'], meaning: '测试签意', action: '测试行动' };
const now = new Date('2026-11-11T03:00:00.000Z');
const ownerA = 'a'.repeat(64);
const ownerB = 'b'.repeat(64);

test('Postgres signbook persists a daily sign and returns the same sign for repeated draws', async () => {
  const pool = new FakePool();
  const store = new PostgresSignbookStore(() => pool);
  let draws = 0;
  const args = {
    action: 'draw', profileId: ownerA, timezone: 'Asia/Shanghai', now,
    randomSign: () => { draws++; return sign; },
    systemId: 'four-seasons-100-signs', systemVersion: '1.0.0', topic: 'general'
  };

  const first = await store.run(args);
  const second = await store.run(args);
  const peek = await store.run({ ...args, action: 'peek' });

  assert.equal(first.sign.title, '柳岸新晴');
  assert.equal(second.id, first.id);
  assert.equal(peek.id, first.id);
  assert.equal(draws, 1);
  assert.equal(pool.rows.length, 1);
});

test('Postgres signbook isolates owners and supports history, favorite, read, and delete', async () => {
  const pool = new FakePool();
  const store = new PostgresSignbookStore(() => pool);
  const record = await store.run({
    action: 'question', profileId: ownerA, timezone: 'Asia/Shanghai', now,
    randomSign: () => sign, systemId: 'four-seasons-100-signs',
    systemVersion: '1.0.0', topic: 'general', question: '测试问题', saveQuestion: true
  });

  const other = await store.run({
    action: 'question', profileId: ownerB, timezone: 'Asia/Shanghai', now,
    randomSign: () => sign, systemId: 'four-seasons-100-signs',
    systemVersion: '1.0.0', topic: 'general'
  });

  assert.equal((await store.history(ownerA)).total, 1);
  assert.equal((await store.history(ownerB)).total, 1);
  assert.equal((await store.find(ownerA, other.id)), null);
  assert.equal((await store.find(ownerA, record.id)).question, '测试问题');

  const favorited = await store.run({ action: 'favorite', profileId: ownerA, recordId: record.id });
  assert.equal(favorited.favorite, true);

  const deleted = await store.run({ action: 'delete', profileId: ownerA, recordId: record.id });
  assert.equal(deleted.deleted, 1);
  assert.equal((await store.history(ownerA)).total, 0);
  assert.equal((await store.history(ownerB)).total, 1);
});
