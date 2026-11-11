import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { getPool, initDatabase, isDatabaseConfigured, closeDatabase } from './db.js';
import { isValidEncryptedEnvelope, isValidOwnerToken, ownerHash } from './security.js';
import { calculateBazi } from '../src/engines/bazi.mjs';
import { calculateZiwei } from '../src/engines/ziwei.mjs';
import { calculateHepan } from '../src/engines/hepan.mjs';
import { calculateHuangli } from '../src/engines/huangli.mjs';
import { castLiuyao } from '../src/engines/liuyao.mjs';
import { castMeihua } from '../src/engines/meihua.mjs';
import { previewBirthTime } from '../src/core/time-preview.mjs';
import { route } from '../src/core/router.mjs';
import { searchKnowledge } from '../src/knowledge/catalog.mjs';
import { renderHTML } from '../src/reports/html.mjs';
import { SignbookStore } from '../src/signs/store.mjs';
import { PostgresSignbookStore } from './postgres-signbook-store.js';
import { DailySignService } from '../src/signs/service.mjs';
import { followUp } from '../src/signs/followup.mjs';
import { listSigns } from '../src/signs/catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 10000);
const ALLOWED_TYPES = new Set(['bazi', 'ziwei', 'liuyao', 'meihua', 'daily', 'almanac', 'compatibility', 'profile']);
const OWNER_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const signServices = new Map();
const signbookRoot = process.env.FORTUNE_SIGNBOOK_DIR || path.join(os.tmpdir(), 'fortune-master-public-signbooks');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' }
}));
app.use(express.json({ limit: '1mb', strict: true }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);

function requireDatabase(_req, res, next) {
  if (!isDatabaseConfigured()) return res.status(503).json({ error: '云端存储尚未启用。可继续使用本机保存，或稍后重试云端同步。' });
  next();
}
function requireOwner(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
  const token = match?.[1];
  if (!isValidOwnerToken(token)) return res.status(401).json({ error: '匿名设备密钥无效，请检查设备备份或刷新页面。' });
  req.ownerToken = token;
  req.ownerHash = ownerHash(token);
  next();
}
function validateRecord(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '请求数据格式不正确。';
  if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) return '记录 ID 格式不正确。';
  if (!ALLOWED_TYPES.has(body.type)) return '记录类型不受支持。';
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120) return '标题须为 1–120 个字符。';
  if (!isValidEncryptedEnvelope(body.payload)) return '加密数据格式不正确。';
  return null;
}
function getDailyService(owner) {
  let service = signServices.get(owner);
  if (service) {
    // Refresh insertion order so this small in-memory cache behaves as LRU.
    signServices.delete(owner);
    signServices.set(owner, service);
    return service;
  }
  // Bound memory use when anonymous devices generate new identifiers.
  if (signServices.size >= 1000) {
    const oldest = signServices.keys().next().value;
    if (oldest) signServices.delete(oldest);
  }
  const filename = path.join(signbookRoot, `${owner}.json`);
  const store = isDatabaseConfigured()
    ? new PostgresSignbookStore()
    : new SignbookStore(filename);
  service = new DailySignService(store);
  signServices.set(owner, service);
  return service;
}
function safeMethod(value) {
  if (typeof value !== 'string' || value.length > 40) throw new Error('计算方式不正确');
  return value;
}
async function calculate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('请求需要 JSON 对象');
  const method = safeMethod(payload.method);
  const params = payload.params ?? {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('params 需要是 JSON 对象');
  switch (method) {
    case 'bazi': return calculateBazi(params);
    case 'ziwei': return calculateZiwei(params);
    case 'hepan': return calculateHepan(params);
    case 'huangli': return calculateHuangli(params);
    case 'liuyao': return castLiuyao(params);
    case 'meihua': return castMeihua(params);
    case 'route': return route(params.query);
    default: throw new Error('未知计算方式');
  }
}

app.get('/api/health', async (_req, res) => {
  let database = 'not_configured';
  if (isDatabaseConfigured()) {
    try { await getPool().query('SELECT 1'); database = 'connected'; }
    catch { database = 'error'; }
  }
  res.status(database === 'error' ? 503 : 200).json({
    status: database === 'error' ? 'degraded' : 'ok', database,
    version: '0.2.0', algorithms: ['bazi', 'ziwei', 'liuyao', 'meihua', 'huangli', 'daily-sign', 'hepan'],
    cloudStorage: database === 'connected',
    signbookStorage: database === 'connected' ? 'postgres' : 'ephemeral-file',
    signbookPersistent: database === 'connected',
    localStorage: true
  });
});
app.get('/health', (_req, res) => res.redirect(307, '/api/health'));

app.post('/api/calculate', async (req, res, next) => {
  try { res.json(await calculate(req.body)); } catch (error) { res.status(400).json({ error: error.message || '计算失败' }); }
});
app.post('/api/report', (req, res) => {
  try {
    const data = req.body?.data;
    if (!data || data.application !== 'Fortune Master' || !['1.2.0', '1.3.0', '1.4.0'].includes(data.schemaVersion)) {
      return res.status(400).json({ error: '报告需提供有效的 Fortune Master 计算结果。' });
    }
    const html = renderHTML(data);
    res.type('html').set('Cache-Control', 'no-store').send(html);
  } catch (error) { res.status(400).json({ error: error.message || '报告生成失败' }); }
});
app.post('/api/knowledge', (req, res) => {
  try { res.json(searchKnowledge(req.body || {})); }
  catch (error) { res.status(400).json({ error: error.message || '知识检索失败' }); }
});
app.post('/api/time-preview', (req, res) => {
  try { res.json(previewBirthTime(req.body || {})); }
  catch (error) { res.status(400).json({ error: error.message || '时间预检失败' }); }
});

// Birth-chart profile data remains in the user's browser, never in a shared server file.
app.post('/api/profiles', (_req, res) => res.status(410).json({ error: '公网版命盘档案仅保存在当前浏览器；请使用本地命盘档案功能。' }));

app.get('/api/records', requireDatabase, requireOwner, async (req, res, next) => {
  try {
    const type = typeof req.query.type === 'string' && ALLOWED_TYPES.has(req.query.type) ? req.query.type : null;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 500);
    const params = type ? [req.ownerHash, type, limit] : [req.ownerHash, limit];
    const sql = type
      ? 'SELECT id, record_type AS type, title, encrypted_payload AS payload, created_at AS "createdAt", updated_at AS "updatedAt" FROM saved_records WHERE owner_hash=$1 AND record_type=$2 ORDER BY updated_at DESC LIMIT $3'
      : 'SELECT id, record_type AS type, title, encrypted_payload AS payload, created_at AS "createdAt", updated_at AS "updatedAt" FROM saved_records WHERE owner_hash=$1 ORDER BY updated_at DESC LIMIT $2';
    const result = await getPool().query(sql, params);
    res.json({ records: result.rows });
  } catch (error) { next(error); }
});
app.post('/api/records', writeLimiter, requireDatabase, requireOwner, async (req, res, next) => {
  const validationError = validateRecord(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { id, type, title, payload } = req.body;
    const db = getPool();
    const existing = await db.query('SELECT 1 FROM saved_records WHERE id=$1 AND owner_hash=$2', [id, req.ownerHash]);
    if (!existing.rowCount) {
      const count = await db.query('SELECT COUNT(*)::int AS total FROM saved_records WHERE owner_hash=$1', [req.ownerHash]);
      if (count.rows[0].total >= 500) return res.status(429).json({ error: '单个匿名设备最多保存 500 条云端记录，请先清理旧记录。' });
    }
    const result = await db.query(
      `INSERT INTO saved_records (id, owner_hash, record_type, title, encrypted_payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET record_type=EXCLUDED.record_type, title=EXCLUDED.title, encrypted_payload=EXCLUDED.encrypted_payload, updated_at=NOW()
       WHERE saved_records.owner_hash=EXCLUDED.owner_hash
       RETURNING id, record_type AS type, title, encrypted_payload AS payload, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, req.ownerHash, type, title.trim(), JSON.stringify(payload)]
    );
    if (!result.rowCount) return res.status(409).json({ error: '记录冲突，请重新保存。' });
    res.status(201).json({ record: result.rows[0] });
  } catch (error) { next(error); }
});
app.delete('/api/records/:id', writeLimiter, requireDatabase, requireOwner, async (req, res, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) return res.status(400).json({ error: '记录 ID 格式不正确。' });
  try {
    const result = await getPool().query('DELETE FROM saved_records WHERE id=$1 AND owner_hash=$2', [req.params.id, req.ownerHash]);
    if (!result.rowCount) return res.status(404).json({ error: '记录不存在。' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/daily-sign', requireOwner, async (req, res) => {
  try {
    const payload = { ...(req.body || {}), profileId: req.ownerHash };
    const service = getDailyService(req.ownerHash);
    const action = payload.action || 'peek';
    if (action === 'status') return res.json(await service.status());
    if (action === 'catalog') return res.json(listSigns({ query: payload.query || '', limit: payload.limit || 100 }));
    if (action === 'history') return res.json(await service.history(payload));
    if (action === 'read') return res.json(await service.readRecord(payload));
    if (action === 'followup') return res.status(400).json({ error: '请使用签文追问接口。' });
    res.json(await service.perform(payload));
  } catch (error) { res.status(400).json({ error: error.message || '每日一签失败' }); }
});
app.post('/api/sign-followup', requireOwner, async (req, res) => {
  try {
    const payload = { ...(req.body || {}), profileId: req.ownerHash };
    const record = await getDailyService(req.ownerHash).readRecord(payload);
    const answer = await followUp({ sign: record.data.result.sign, topic: payload.topic || record.data.input.topic, question: payload.question, allowExternal: payload.allowExternal === true });
    res.json(answer);
  } catch (error) { res.status(400).json({ error: error.message || '签文追问失败' }); }
});

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: 0 }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((error, _req, res, _next) => {
  console.error('Request error:', error.message);
  if (res.headersSent) return;
  res.status(500).json({ error: '服务器暂时无法处理请求，请稍后重试。' });
});

const server = app.listen(PORT, '0.0.0.0', async () => {
  try {
    if (isDatabaseConfigured()) await initDatabase();
    console.log(`Fortune Master public V1.5.0 listening on 0.0.0.0:${PORT}`);
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exitCode = 1;
    server.close();
  }
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(async () => { await closeDatabase(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
