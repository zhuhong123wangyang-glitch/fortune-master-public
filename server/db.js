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
  `);
  initialized = true;
  return true;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
  initialized = false;
}
