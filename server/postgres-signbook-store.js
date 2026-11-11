import { randomUUID } from 'node:crypto';
import { checkProfile, checkTimezone, localDay } from '../src/signs/store.mjs';
import { getPool } from './db.js';

const MAX_RECORDS_PER_PROFILE = 5000;
const COLUMNS = `id, owner_hash, record_kind, sign_date, timezone, drawn_at,
  sign, system_id, system_version, topic, question, favorite`;

function toRecord(row) {
  if (!row) return null;
  const date = row.sign_date instanceof Date
    ? row.sign_date.toISOString().slice(0, 10)
    : String(row.sign_date).slice(0, 10);
  return {
    id: row.id,
    profileId: String(row.owner_hash).trim(),
    kind: row.record_kind,
    date,
    timezone: row.timezone,
    drawnAt: row.drawn_at instanceof Date ? row.drawn_at.toISOString() : new Date(row.drawn_at).toISOString(),
    sign: row.sign,
    systemId: row.system_id,
    systemVersion: row.system_version,
    topic: row.topic,
    question: row.question || '',
    favorite: Boolean(row.favorite)
  };
}

export class PostgresSignbookStore {
  constructor(poolProvider = getPool) {
    this.poolProvider = poolProvider;
    this.storageType = 'postgres';
  }

  #pool() {
    const pool = this.poolProvider();
    if (!pool) throw new Error('PostgreSQL 尚未配置，签簿暂不可用。');
    return pool;
  }

  async run({
    action,
    profileId = 'local-default',
    timezone = 'Asia/Shanghai',
    now = new Date(),
    randomSign,
    recordId,
    saveQuestion = false,
    question = '',
    systemId,
    systemVersion,
    topic = 'general'
  } = {}) {
    profileId = checkProfile(profileId);
    if (!['peek', 'draw', 'question', 'favorite', 'delete', 'clear'].includes(action)) {
      throw new Error('未知签簿操作');
    }
    if (['peek', 'draw', 'question'].includes(action)) checkTimezone(timezone);
    const pool = this.#pool();

    if (action === 'peek' || action === 'draw') {
      const date = localDay(now, timezone);
      const existing = await pool.query(
        `SELECT ${COLUMNS} FROM daily_sign_records
         WHERE owner_hash = $1 AND record_kind = 'daily' AND sign_date = $2
         ORDER BY drawn_at DESC LIMIT 1`,
        [profileId, date]
      );
      if (existing.rowCount) return toRecord(existing.rows[0]);
      if (action === 'peek') return null;
      return this.#insertRecord(pool, {
        profileId, kind: 'daily', date, timezone, now, randomSign,
        saveQuestion: false, question: '', systemId, systemVersion, topic
      });
    }

    if (action === 'clear') {
      const result = await pool.query(
        'DELETE FROM daily_sign_records WHERE owner_hash = $1 RETURNING id',
        [profileId]
      );
      return { deleted: result.rowCount };
    }

    if (action === 'favorite' || action === 'delete') {
      if (typeof recordId !== 'string' || recordId.length > 64) throw new Error('记录标识无效');
      if (action === 'favorite') {
        const result = await pool.query(
          `UPDATE daily_sign_records SET favorite = NOT favorite
           WHERE owner_hash = $1 AND id = $2 RETURNING ${COLUMNS}`,
          [profileId, recordId]
        );
        if (!result.rowCount) throw new Error('当前档案中找不到这条记录');
        return toRecord(result.rows[0]);
      }
      const result = await pool.query(
        'DELETE FROM daily_sign_records WHERE owner_hash = $1 AND id = $2 RETURNING id',
        [profileId, recordId]
      );
      if (!result.rowCount) throw new Error('当前档案中找不到这条记录');
      return { deleted: 1 };
    }

    if (action === 'question') {
      const date = localDay(now, timezone);
      return this.#insertRecord(pool, {
        profileId, kind: 'question', date, timezone, now, randomSign,
        saveQuestion, question, systemId, systemVersion, topic
      });
    }

    throw new Error('未知签簿操作');
  }

  async #insertRecord(pool, {
    profileId, kind, date, timezone, now, randomSign,
    saveQuestion, question, systemId, systemVersion, topic
  }) {
    const count = await pool.query(
      'SELECT COUNT(*)::int AS total FROM daily_sign_records WHERE owner_hash = $1',
      [profileId]
    );
    if (count.rows[0].total >= MAX_RECORDS_PER_PROFILE) {
      throw new Error('签簿记录已达上限，请先导出或清理历史记录');
    }
    if (typeof randomSign !== 'function') throw new Error('缺少签文随机抽取函数');

    const record = {
      id: randomUUID(),
      profileId,
      kind,
      date,
      timezone,
      drawnAt: now.toISOString(),
      sign: randomSign(),
      systemId,
      systemVersion,
      topic,
      question: saveQuestion ? question : '',
      favorite: false
    };
    const inserted = await pool.query(
      `INSERT INTO daily_sign_records
       (id, owner_hash, record_kind, sign_date, timezone, drawn_at, sign,
        system_id, system_version, topic, question, favorite)
       VALUES ($1, $2, $3, $4::date, $5, $6::timestamptz, $7::jsonb,
               $8, $9, $10, $11, FALSE)
       ON CONFLICT DO NOTHING
       RETURNING ${COLUMNS}`,
      [
        record.id, profileId, kind, date, timezone, record.drawnAt,
        JSON.stringify(record.sign), systemId, systemVersion, topic,
        record.question
      ]
    );
    if (inserted.rowCount) return toRecord(inserted.rows[0]);

    // A concurrent daily draw may win the unique (device, date) constraint.
    // Return that committed record so one device never receives two daily signs.
    if (kind === 'daily') {
      const existing = await pool.query(
        `SELECT ${COLUMNS} FROM daily_sign_records
         WHERE owner_hash = $1 AND record_kind = 'daily' AND sign_date = $2
         ORDER BY drawn_at DESC LIMIT 1`,
        [profileId, date]
      );
      if (existing.rowCount) return toRecord(existing.rows[0]);
    }
    throw new Error('签簿写入冲突，请重试。');
  }

  async history(profileId, { kind = 'all', limit = 100, offset = 0, month } = {}) {
    profileId = checkProfile(profileId);
    if (!['all', 'daily', 'question'].includes(kind)) throw new Error('kind 无效');
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('limit 必须在 1~500');
    if (!Number.isInteger(offset) || offset < 0 || offset > 5000) throw new Error('offset 必须在 0~5000');
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('month 必须为 YYYY-MM');

    const filters = ['owner_hash = $1'];
    const values = [profileId];
    if (kind !== 'all') {
      values.push(kind);
      filters.push(`record_kind = $${values.length}`);
    }
    if (month) {
      values.push(`${month}-01`);
      const index = values.length;
      filters.push(`sign_date >= $${index}::date AND sign_date < ($${index}::date + INTERVAL '1 month')`);
    }
    const where = filters.join(' AND ');
    const count = await this.#pool().query(
      `SELECT COUNT(*)::int AS total FROM daily_sign_records WHERE ${where}`,
      values
    );
    const pageValues = [...values, limit, offset];
    const rows = await this.#pool().query(
      `SELECT ${COLUMNS} FROM daily_sign_records
       WHERE ${where} ORDER BY drawn_at DESC
       LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues
    );
    return { total: count.rows[0].total, items: rows.rows.map(toRecord) };
  }

  async find(profileId, id) {
    profileId = checkProfile(profileId);
    const result = await this.#pool().query(
      `SELECT ${COLUMNS} FROM daily_sign_records WHERE owner_hash = $1 AND id = $2 LIMIT 1`,
      [profileId, id]
    );
    return toRecord(result.rows[0]);
  }

  async importRecords(profileId, records) {
    profileId = checkProfile(profileId);
    if (!Array.isArray(records) || records.length > 5000) throw new Error('备份最多允许导入 5000 条记录');
    const pool = this.#pool();
    let imported = 0, skipped = 0;
    for (const record of records) {
      const result = await pool.query(
        `INSERT INTO daily_sign_records
         (id, owner_hash, record_kind, sign_date, timezone, drawn_at, sign,
          system_id, system_version, topic, question, favorite)
         VALUES ($1, $2, $3, $4::date, $5, $6::timestamptz, $7::jsonb,
                 $8, $9, $10, $11, $12)
         ON CONFLICT DO NOTHING RETURNING id`,
        [record.id, profileId, record.kind, record.date, record.timezone,
          record.drawnAt, JSON.stringify(record.sign), record.systemId,
          record.systemVersion, record.topic, record.question || '', Boolean(record.favorite)]
      );
      if (result.rowCount) imported++; else skipped++;
    }
    return { imported, skipped };
  }
}
