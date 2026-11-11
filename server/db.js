import pg from 'pg';

const { Pool } = pg;
let pool;
let initialized = false;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!isDatabaseConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
    pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error.message));
  }
  return pool;
}

export async function initDatabase() {
  const db = getPool();
  if (!db) return false;
  if (initialized) return true;

  await db.query(`
    CREATE TABLE IF NOT EXISTS saved_records (
      id UUID PRIMARY KEY,
      owner_hash CHAR(64) NOT NULL,
      record_type VARCHAR(32) NOT NULL,
      title VARCHAR(120) NOT NULL,
      encrypted_payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS saved_records_owner_updated_idx
      ON saved_records (owner_hash, updated_at DESC);
    CREATE INDEX IF NOT EXISTS saved_records_owner_type_idx
      ON saved_records (owner_hash, record_type);

    CREATE TABLE IF NOT EXISTS daily_sign_records (
      id UUID PRIMARY KEY,
      owner_hash CHAR(64) NOT NULL,
      record_kind VARCHAR(16) NOT NULL CHECK (record_kind IN ('daily', 'question')),
      sign_date DATE NOT NULL,
      timezone VARCHAR(80) NOT NULL,
      drawn_at TIMESTAMPTZ NOT NULL,
      sign JSONB NOT NULL,
      system_id VARCHAR(64) NOT NULL,
      system_version VARCHAR(32) NOT NULL,
      topic VARCHAR(32) NOT NULL,
      question VARCHAR(500) NOT NULL DEFAULT '',
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS daily_sign_records_one_daily_per_device_idx
      ON daily_sign_records (owner_hash, sign_date)
      WHERE record_kind = 'daily';
    CREATE INDEX IF NOT EXISTS daily_sign_records_owner_drawn_idx
      ON daily_sign_records (owner_hash, drawn_at DESC);
    CREATE INDEX IF NOT EXISTS daily_sign_records_owner_kind_date_idx
      ON daily_sign_records (owner_hash, record_kind, sign_date DESC);
  `);
  initialized = true;
  return true;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
  initialized = false;
}
