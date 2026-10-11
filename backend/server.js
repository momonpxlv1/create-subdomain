/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */




require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const Database = require('better-sqlite3');
const net = require('net');

const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: CORS_ORIGINS.length ? CORS_ORIGINS : false,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const DATA_KEY = process.env.DATA_KEY ? Buffer.from(process.env.DATA_KEY, 'hex') : null;
if (DATA_KEY && DATA_KEY.length !== 32) {
  console.error('[crypto] DATA_KEY harus 64 karakter hex (32 byte)');
  process.exit(1);
}
const ENC_PREFIX = 'enc:v1:';

function encryptToken(plain) {
  if (!DATA_KEY || typeof plain !== 'string' || plain.startsWith(ENC_PREFIX)) return plain;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ENC_PREFIX + iv.toString('base64') + ':' + c.getAuthTag().toString('base64') + ':' + ct.toString('base64');
}

function decryptToken(stored) {
  if (typeof stored !== 'string' || !stored.startsWith(ENC_PREFIX)) return stored;
  if (!DATA_KEY) throw new Error('DATA_KEY belum diset, token terenkripsi tidak bisa dibaca');
  const parts = stored.slice(ENC_PREFIX.length).split(':').map(x => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', DATA_KEY, parts[0]);
  d.setAuthTag(parts[1]);
  return Buffer.concat([d.update(parts[2]), d.final()]).toString('utf8');
}

const db = new Database('subforge.db');
const _prepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const st = _prepare(sql);
  const dec = (r) => (r && typeof r === 'object' && typeof r.api_token === 'string') ? { ...r, api_token: decryptToken(r.api_token) } : r;
  return {
    get: (...a) => dec(st.get(...a)),
    all: (...a) => st.all(...a).map(dec),
    run: (...a) => st.run(...a)
  };
};


db.exec(`
CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  label TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  api_token TEXT NOT NULL,
  zone_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS subdomains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subdomain TEXT NOT NULL,
  domain TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  proxied INTEGER DEFAULT 0,
  ttl INTEGER DEFAULT 1,
  code_used TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  subdomain_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(code, subdomain_id)
);
`);

const codeCols = db.prepare("PRAGMA table_info(codes)").all();
if (!codeCols.find(c => c.name === 'max_usage')) db.exec('ALTER TABLE codes ADD COLUMN max_usage INTEGER DEFAULT NULL');
if (!codeCols.find(c => c.name === 'expires_at')) db.exec('ALTER TABLE codes ADD COLUMN expires_at DATETIME DEFAULT NULL');
if (!codeCols.find(c => c.name === 'allowed_domains')) db.exec('ALTER TABLE codes ADD COLUMN allowed_domains TEXT DEFAULT NULL');

try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_subdomains_unique_name ON subdomains(subdomain COLLATE NOCASE, domain COLLATE NOCASE)');
} catch (e) {
  console.warn('[db] Gagal bikin unique index (ada nama dobel di DB?):', e.message);
}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_subdomains_code ON subdomains(code_used)'); } catch (e) 

{
  const subCols = db.prepare('PRAGMA table_info(subdomains)').all().map(c => c.name);
  if (!subCols.includes('suspended')) db.exec('ALTER TABLE subdomains ADD COLUMN suspended INTEGER DEFAULT 0');
  if (!subCols.includes('suspend_reason')) db.exec('ALTER TABLE subdomains ADD COLUMN suspend_reason TEXT');
  if (!subCols.includes('suspended_at')) db.exec('ALTER TABLE subdomains ADD COLUMN suspended_at DATETIME');
  if (!subCols.includes('suspend_snapshot')) db.exec('ALTER TABLE subdomains ADD COLUMN suspend_snapshot TEXT');
  const codeColNames = db.prepare('PRAGMA table_info(codes)').all().map(c => c.name);
  if (!codeColNames.includes('blocked')) db.exec('ALTER TABLE codes ADD COLUMN blocked INTEGER DEFAULT 0');
}


const seedCount = db.prepare('SELECT COUNT(*) AS c FROM domains').get().c;
if (seedCount === 0) {
  try {
    const domainsFromEnv = JSON.parse(process.env.DOMAINS_JSON || '[]');
    const insert = db.prepare('INSERT OR IGNORE INTO domains (name, provider, api_token, zone_id, enabled) VALUES (?, ?, ?, ?, ?)');
    db.exec('BEGIN');
    try {
      for (const d of domainsFromEnv) insert.run(d.name, d.provider, encryptToken(d.apiToken), d.zoneId, d.enabled ? 1 : 0);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    console.log(`[seed] ${domainsFromEnv.length} domain dimuat dari .env`);
  } catch (e) {
    console.error('[seed] Gagal parse DOMAINS_JSON:', e.message);
  }
}

if (DATA_KEY) {
  const rawRows = _prepare('SELECT id, api_token FROM domains').all();
  const upd = _prepare('UPDATE domains SET api_token = ? WHERE id = ?');
  let encrypted = 0;
  for (const r of rawRows) {
    if (!String(r.api_token).startsWith(ENC_PREFIX)) { upd.run(encryptToken(r.api_token), r.id); encrypted++; }
  }
  if (encrypted) console.log('[crypto] ' + encrypted + ' api_token dienkripsi');
} else {
  console.warn('[crypto] DATA_KEY belum diset, api_token disimpan plaintext');
}


function logActivity(action, detail, req) {
  try {
    const ip = req ? (req.ip || req.socket?.remoteAddress || 'unknown') : 'system';
    db.prepare('INSERT INTO activity_log (action, detail, ip) VALUES (?, ?, ?)').run(action, detail || null, String(ip));
  } catch (e) { console.error('[log] gagal:', e.message); }
}

function getIp(req) {
  return (req && (req.ip || req.socket?.remoteAddress)) || 'unknown';
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');


const maskCode = (s) => {
  const str = String(s ?? '');
  if (str.length <= 5) return str;
  return str.slice(0, 5) + '*'.repeat(str.length - 5);
};

async function notifyTelegram(html) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if (!r.ok) {
      const err = await r.text();
      console.warn('[telegram] gagal kirim:', err.slice(0, 200));
    }
  } catch (e) { console.error('[telegram] error:', e.message); }
}

function checkCodeValidity(codeRow) {
  if (!codeRow) return { valid: false, reason: 'Kode tidak ditemukan' };
  if (codeRow.blocked) return { valid: false, reason: 'Kode diblokir oleh admin' };
  if (codeRow.max_usage !== null && codeRow.max_usage !== undefined && codeRow.usage_count >= codeRow.max_usage) {
    return { valid: false, reason: 'Kode sudah mencapai batas pemakaian' };
  }
  if (codeRow.expires_at) {
    const exp = new Date(codeRow.expires_at);
    if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return { valid: false, reason: 'Kode sudah kadaluarsa' };
    }
  }
  return { valid: true };
}

function parseAllowedDomains(raw) {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : null;
  } catch { return null; }
}


const HOST_RE = /^(?=.{1,253}$)([a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?\.)+[a-z][a-z0-9-]{1,62}$/i;
const isHostname = (s) => {
  if (typeof s !== 'string') return false;
  const h = s.replace(/\.$/, '');
  return !net.isIP(h) && HOST_RE.test(h);
};
const inRange = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function isPrivateIPv4(ip) {
  if (process.env.ALLOW_PRIVATE_IP === '1') return false;
  const [a, b, c] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
}

function isPrivateIPv6(ip) {
  if (process.env.ALLOW_PRIVATE_IP === '1') return false;
  const h = ip.toLowerCase().split(':')[0];
  if (h === '') return true;
  const n = parseInt(h, 16);
  return (n & 0xfe00) === 0xfc00 || (n & 0xffc0) === 0xfe80 || (n & 0xff00) === 0xff00;
}

function validateTtl(ttl) {
  if (ttl === undefined || ttl === null || ttl === '') return null;
  const t = Number(ttl);
  if (t === 1 || inRange(t, 60, 86400)) return null;
  return 'TTL harus 1 (auto) atau 60 - 86400 detik';
}

function validateRecordInput({ type, content, ttl, priority, srv, caa }) {
  const ttlErr = validateTtl(ttl);
  if (ttlErr) return ttlErr;
  const c = typeof content === 'string' ? content.trim() : '';
  switch (type) {
    case 'A':
      if (!net.isIPv4(c)) return 'Content A harus alamat IPv4 yang valid';
      return isPrivateIPv4(c) ? 'IP privat / loopback / reserved tidak diizinkan' : null;
    case 'AAAA':
      if (!net.isIPv6(c)) return 'Content AAAA harus alamat IPv6 yang valid';
      return isPrivateIPv6(c) ? 'IPv6 privat / loopback / reserved tidak diizinkan' : null;
    case 'CNAME':
    case 'NS':
      if (!isHostname(c)) return 'Content harus berupa hostname yang valid';
      return /(^|\.)(localhost|local|internal|lan)\.?$/i.test(c) ? 'Hostname lokal / internal tidak diizinkan' : null;
    case 'MX':
      if (!isHostname(c)) return 'Mail server harus berupa hostname yang valid';
      if (priority !== undefined && priority !== null && priority !== '' && !inRange(Number(priority), 0, 65535)) return 'Priority MX harus 0 - 65535';
      return null;
    case 'TXT':
      if (c.length < 1 || c.length > 2048) return 'Content TXT harus 1 - 2048 karakter';
      if (/[\u0000-\u001f\u007f]/.test(c)) return 'Content TXT tidak boleh mengandung karakter kontrol';
      return null;
    case 'CAA': {
      if (!caa || typeof caa !== 'object') return 'Data CAA tidak valid';
      if (!['issue', 'issuewild', 'iodef'].includes(caa.tag)) return 'Tag CAA harus issue, issuewild, atau iodef';
      if (![0, 128].includes(Number(caa.flags || 0))) return 'Flags CAA harus 0 atau 128';
      const v = typeof caa.value === 'string' ? caa.value.trim() : '';
      if (v.length < 1 || v.length > 255 || /[\u0000-\u001f\u007f]/.test(v)) return 'Value CAA tidak valid';
      return null;
    }
    case 'SRV': {
      if (!srv || typeof srv !== 'object') return 'Data SRV tidak valid';
      if (!inRange(Number(srv.port), 1, 65535)) return 'Port SRV harus 1 - 65535';
      if (srv.priority !== undefined && srv.priority !== '' && !inRange(Number(srv.priority), 0, 65535)) return 'Priority SRV harus 0 - 65535';
      if (srv.weight !== undefined && srv.weight !== '' && !inRange(Number(srv.weight), 0, 65535)) return 'Weight SRV harus 0 - 65535';
      if (!isHostname(String(srv.target || '').trim())) return 'Target SRV harus berupa hostname yang valid';
      return null;
    }
    default: return 'Tipe record tidak didukung';
  }
}


const BLACKLIST_NAMES = (process.env.BLACKLIST_NAMES || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

function isBlacklisted(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return BLACKLIST_NAMES.includes(n);
}


const MAX_SUBDOMAINS_PER_CODE = Number(process.env.MAX_SUBDOMAINS_PER_CODE ?? 10);


const DEFAULT_KEYWORDS = 'login,signin,paypal,bank,binance,metamask,facebook,instagram,whatsapp,netflix,shopee,tokopedia,mandiri,klikbca,verifikasi,verification,webmail';
const BLACKLIST_KEYWORDS = (process.env.BLACKLIST_KEYWORDS !== undefined ? process.env.BLACKLIST_KEYWORDS : DEFAULT_KEYWORDS)
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function isSuspiciousName(name) {
  const base = String(name || '').toLowerCase().replace(/[-_]/g, '')
    .replace(/0/g, 'o').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's');
  const variants = [base.replace(/1/g, 'i'), base.replace(/1/g, 'l')];
  return BLACKLIST_KEYWORDS.some(k => variants.some(v => v.includes(k)));
}


const COOKIE_NAME = 'sf_user_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: COOKIE_MAX_AGE,
  path: '/'
};

function setUserCookie(res, token) { res.cookie(COOKIE_NAME, token, cookieOpts); }

const ADMIN_COOKIE_NAME = 'sf_admin_token';
const adminCookieOpts = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};
const adminClearOpts = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };
function clearUserCookie(res) { res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: 0 }); }


function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

const auth = (req, res, next) => {
  const token = req.cookies && req.cookies[ADMIN_COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.admin) return res.status(401).json({ error: 'Invalid token' });
    req.admin = true;
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};

const userAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.user) return res.status(401).json({ error: 'Invalid token' });
    const cRow = db.prepare('SELECT blocked FROM codes WHERE code = ?').get(decoded.code);
    if (!cRow || cRow.blocked) return res.status(401).json({ error: 'Kode tidak aktif atau diblokir' });
    req.userCode = decoded.code;
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};


async function cfDeleteRecord(zoneId, apiToken, type, fullName) {
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${type}&name=${fullName}`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  const listData = await listRes.json();
  if (listData.success && listData.result?.length > 0) {
    const cfId = listData.result[0].id;
    const delRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${cfId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } }
    );
    const delData = await delRes.json();
    if (!delData.success) console.warn('[cf delete] warning:', delData.errors);
  }
}

async function cfUpdateRecord(zoneId, apiToken, type, fullName, patchBody) {
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${type}&name=${fullName}`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  const listData = await listRes.json();
  if (!listData.success || !listData.result?.length) {
    return { success: false, error: 'Record tidak ditemukan di Cloudflare' };
  }
  const cfId = listData.result[0].id;
  const patchRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${cfId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    }
  );
  return await patchRes.json();
}


const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak percobaan verifikasi. Coba lagi setelah 1 menit.' } });
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak permintaan. Coba lagi setelah 1 menit.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak percobaan login. Coba lagi setelah 15 menit.' } });
const userLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak kode salah. Coba lagi setelah 15 menit.' } });
const dnsLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Terlalu banyak permintaan DNS. Coba lagi sebentar.' } });


app.get('/api/public-stats', (req, res) => {
  const domains = db.prepare('SELECT COUNT(*) c FROM domains WHERE enabled = 1').get().c;
  const subdomains = db.prepare('SELECT COUNT(*) c FROM subdomains').get().c;
  const codes = db.prepare('SELECT COUNT(*) c FROM codes').get().c;
  res.json({ domains, subdomains, codes });
});

app.get('/api/public/status', (req, res) => {
  const totals = {
    subdomains: db.prepare('SELECT COUNT(*) c FROM subdomains').get().c,
    domainsActive: db.prepare('SELECT COUNT(*) c FROM domains WHERE enabled = 1').get().c,
    domainsTotal: db.prepare('SELECT COUNT(*) c FROM domains').get().c,
    codes: db.prepare('SELECT COUNT(*) c FROM codes').get().c,
    codesActive: db.prepare("SELECT COUNT(*) c FROM codes WHERE (expires_at IS NULL OR datetime(expires_at) > datetime('now'))").get().c
  };

  const activity = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = db.prepare("SELECT COUNT(*) c FROM subdomains WHERE date(created_at) = ?").get(dateStr).c;
    activity.push({ date: dateStr, count });
  }

  const recent = db.prepare('SELECT subdomain, domain, type, created_at FROM subdomains ORDER BY created_at DESC LIMIT 5').all();

  res.json({
    totals,
    activity,
    recent: recent.map(r => ({
      name: `${r.subdomain}.${r.domain}`,
      type: r.type,
      created_at: r.created_at
    })),
    uptime: Math.floor(process.uptime()),
    now: new Date().toISOString()
  });
});

app.get('/api/blacklist', (req, res) => {
  res.json({ names: BLACKLIST_NAMES });
});

app.get('/api/domains', (req, res) => {
  const rows = db.prepare('SELECT id, name, provider FROM domains WHERE enabled = 1 ORDER BY name').all();
  res.json(rows);
});

app.post('/api/verify-code', verifyLimiter, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.json({ valid: false, reason: 'Kode wajib diisi' });
  const row = db.prepare('SELECT * FROM codes WHERE code = ?').get(String(code).trim());
  const check = checkCodeValidity(row);
  if (!check.valid) return res.json({ valid: false, reason: check.reason });
  res.json({
    valid: true,
    allowed_domains: parseAllowedDomains(row.allowed_domains),
    label: row.label,
    expires_at: row.expires_at,
    remaining: row.max_usage === null || row.max_usage === undefined ? null : Math.max(row.max_usage - row.usage_count, 0)
  });
});

app.post('/api/subdomain', createLimiter, async (req, res) => {
  const ip = getIp(req);
  let reservedId = null;
  let pendingSubId = null;
  const releaseReservation = () => {
    if (reservedId !== null) {
      db.prepare('UPDATE codes SET usage_count = MAX(usage_count - 1, 0) WHERE id = ?').run(reservedId);
      if (pendingSubId !== null) { db.prepare('DELETE FROM subdomains WHERE id = ?').run(pendingSubId); pendingSubId = null; }
      reservedId = null;
    }
  };
  try {
    let { code, domainId, subdomain, type, content, proxied, ttl, priority, srv, caa } = req.body || {};
    if (typeof content === 'string') content = content.trim();
    if (!code) return res.status(400).json({ error: 'Unique code wajib diisi' });

    const codeRow = db.prepare('SELECT * FROM codes WHERE code = ?').get(String(code).trim());
    const check = checkCodeValidity(codeRow);
    if (!check.valid) {
      notifyTelegram(`<b>SUBDOMAIN GAGAL</b>\n\n<blockquote>Kode: ${esc(maskCode(code))}\nAlasan: ${esc(check.reason)}\nIP: ${esc(ip)}</blockquote>`).catch(() => {});
      return res.status(400).json({ error: check.reason });
    }

    const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId);
    if (!domain) return res.status(404).json({ error: 'Domain tidak ditemukan' });
    if (!domain.enabled) {
      notifyTelegram(`<b>SUBDOMAIN GAGAL</b>\n\n<blockquote>Nama: ${esc(subdomain)}.${esc(domain?.name || '?')}\nType: ${esc(type)}\nAlasan: Domain dinonaktifkan\nKode: ${esc(maskCode(codeRow.code))}\nIP: ${esc(ip)}</blockquote>`).catch(() => {});
      return res.status(400).json({ error: 'Domain sedang dinonaktifkan' });
    }

    const allowed = parseAllowedDomains(codeRow.allowed_domains);
    if (allowed && !allowed.includes(domain.name)) {
      notifyTelegram(`<b>SUBDOMAIN GAGAL</b>\n\n<blockquote>Nama: ${esc(subdomain)}.${esc(domain.name)}\nType: ${esc(type)}\nAlasan: Domain tidak diizinkan untuk kode ini\nKode: ${esc(maskCode(codeRow.code))}\nIP: ${esc(ip)}</blockquote>`).catch(() => {});
      return res.status(400).json({ error: `Kode ini tidak boleh dipakai untuk domain ${domain.name}` });
    }

    if (!subdomain || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
      return res.status(400).json({ error: 'Nama subdomain tidak valid (huruf/angka/dash)' });
    }

    
    if (isSuspiciousName(subdomain)) {
      notifyTelegram('<b>SUBDOMAIN GAGAL</b>\n\n<blockquote>Nama: ' + esc(subdomain) + '.' + esc(domain.name) + '\nAlasan: Nama mengandung kata terlarang\nKode: ' + esc(maskCode(codeRow.code)) + '\nIP: ' + esc(ip) + '</blockquote>').catch(() => {});
      return res.status(400).json({ error: 'Nama subdomain mengandung kata yang tidak diizinkan' });
    }

    
    if (isBlacklisted(subdomain)) {
      notifyTelegram(`<b>SUBDOMAIN GAGAL</b>\n\n<blockquote>Nama: ${esc(subdomain)}.${esc(domain.name)}\nAlasan: Nama di-blacklist (reserved)\nKode: ${esc(maskCode(codeRow.code))}\nIP: ${esc(ip)}</blockquote>`).catch(() => {});
      return res.status(400).json({ error: `Nama "${subdomain}" tidak diizinkan karena reserved untuk sistem` });
    }

    const fullName = `${subdomain}.${domain.name}`;
    const ALLOWED_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'CAA', 'SRV'];
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipe record tidak didukung' });
    }
    const inputErr = validateRecordInput({ type, content, ttl, priority, srv, caa });
    if (inputErr) return res.status(400).json({ error: inputErr });

    const body = { type, name: fullName, ttl: Number(ttl) || 1 };

    if (['A', 'AAAA', 'CNAME'].includes(type)) {
      if (!content) return res.status(400).json({ error: 'Content wajib diisi' });
      body.content = content; body.proxied = !!proxied;
    } else if (type === 'MX') {
      if (!content) return res.status(400).json({ error: 'Mail server wajib diisi' });
      body.content = content; body.priority = Number(priority) || 10;
    } else if (type === 'CAA') {
      body.data = { flags: Number(caa?.flags) || 0, tag: caa?.tag || 'issue', value: caa?.value || '' };
      if (!body.data.value) return res.status(400).json({ error: 'CAA value wajib diisi' });
    } else if (type === 'SRV') {
      body.data = { priority: Number(srv?.priority) || 10, weight: Number(srv?.weight) || 0, port: Number(srv?.port) || 0, target: srv?.target || '' };
      if (!body.data.target || !body.data.port) return res.status(400).json({ error: 'SRV target & port wajib diisi' });
    } else {
      if (!content) return res.status(400).json({ error: 'Content wajib diisi' });
      body.content = content;
    }

    
    const stored = body.content || JSON.stringify(body.data || {});
    const nameTaken = db.prepare('SELECT id FROM subdomains WHERE subdomain = ? COLLATE NOCASE AND domain = ? COLLATE NOCASE').get(subdomain, domain.name);
    if (nameTaken) {
      return res.status(409).json({ error: 'Nama ' + fullName + ' sudah dipakai, pilih nama lain' });
    }
    if (MAX_SUBDOMAINS_PER_CODE > 0) {
      const activeCount = db.prepare('SELECT COUNT(*) c FROM subdomains WHERE code_used = ?').get(codeRow.code).c;
      if (activeCount >= MAX_SUBDOMAINS_PER_CODE) {
        return res.status(400).json({ error: 'Batas subdomain untuk kode ini tercapai (' + MAX_SUBDOMAINS_PER_CODE + '). Hapus salah satu dulu.' });
      }
    }
    const reserve = db.prepare('UPDATE codes SET usage_count = usage_count + 1 WHERE id = ? AND (max_usage IS NULL OR usage_count < max_usage)').run(codeRow.id);
    if (reserve.changes === 0) {
      return res.status(400).json({ error: 'Kode sudah mencapai batas pemakaian' });
    }
    reservedId = codeRow.id;
    try {
      pendingSubId = db.prepare('INSERT INTO subdomains (subdomain, domain, type, content, proxied, ttl, code_used) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(subdomain, domain.name, type, stored, body.proxied ? 1 : 0, body.ttl, codeRow.code).lastInsertRowid;
    } catch (e) {
      releaseReservation();
      return res.status(409).json({ error: 'Nama ' + fullName + ' sudah dipakai, pilih nama lain' });
    }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${domain.zone_id}/dns_records`,
      { method: 'POST', headers: { Authorization: `Bearer ${domain.api_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const data = await cfRes.json();

    if (!data.success) {
      releaseReservation();
      const msg = data.errors?.[0]?.message || 'Cloudflare API error';
      notifyTelegram(`<b>SUBDOMAIN GAGAL</b>\n\n<blockquote>Nama: ${esc(fullName)}\nType: ${esc(type)}\nValue: ${esc(body.content || JSON.stringify(body.data || {}))}\nAlasan: ${esc(msg)}\nKode: ${esc(maskCode(codeRow.code))}\nIP: ${esc(ip)}</blockquote>`).catch(() => {});
      return res.status(400).json({ error: msg, detail: data.errors });
    }

    reservedId = null; 
    pendingSubId = null;

    logActivity('subdomain.create', fullName, req);
    notifyTelegram(
      `<b>SUBDOMAIN BARU</b>\n\n<blockquote>Nama: ${esc(fullName)}\nType: ${esc(type)}\nValue: ${esc(stored)}\nTTL: ${esc(body.ttl)}\n${body.proxied !== undefined ? `Proxied: ${body.proxied ? 'Ya' : 'Tidak'}\n` : ''}Kode: ${esc(maskCode(codeRow.code))}\n${codeRow.label ? `Label: ${esc(codeRow.label)}\n` : ''}IP: ${esc(ip)}</blockquote>`
    ).catch(() => {});

    res.json({ success: true, record: data.result });
  } catch (e) {
    releaseReservation();
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

app.post('/api/dns/check', dnsLimiter, async (req, res) => {
  try {
    const { name, type } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: 'name & type wajib' });
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
    const r = await fetch(url, { headers: { Accept: 'application/dns-json' } });
    const data = await r.json();
    const typeMap = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 257: 'CAA', 33: 'SRV' };
    const answers = (data.Answer || []).map(a => ({ name: a.name, type: typeMap[a.type] || String(a.type), ttl: a.TTL, data: a.data }));
    res.json({ success: true, status: data.Status, statusText: data.Status === 0 ? 'NOERROR' : (data.Status === 3 ? 'NXDOMAIN' : `Status ${data.Status}`), answers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOpts);
    logActivity('admin.login', `Login berhasil: ${username}`, req);
    return res.json({ success: true });
  }
  logActivity('admin.login_fail', `Login gagal: ${username}`, req);
  res.status(401).json({ error: 'Username atau password salah' });
});

app.get('/api/admin/me', (req, res) => {
  const token = req.cookies && req.cookies[ADMIN_COOKIE_NAME];
  if (!token) return res.json({ admin: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ admin: !!decoded.admin });
  } catch { res.json({ admin: false }); }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, adminClearOpts);
  res.json({ success: true });
});

app.get('/api/admin/codes', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM codes ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...r, allowed_domains: parseAllowedDomains(r.allowed_domains) })));
});

app.post('/api/admin/codes', auth, async (req, res) => {
  const { code, label, max_usage, expires_at, allowed_domains } = req.body || {};
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Code wajib diisi' });

  const maxUsageValue = (max_usage === null || max_usage === '' || max_usage === undefined) ? null : Number(max_usage);
  if (maxUsageValue !== null && (isNaN(maxUsageValue) || maxUsageValue < 1)) {
    return res.status(400).json({ error: 'Batas pemakaian harus angka >= 1 atau kosong' });
  }
  const expiresValue = (expires_at === null || expires_at === '' || expires_at === undefined) ? null : expires_at;
  const allowedJson = Array.isArray(allowed_domains) && allowed_domains.length > 0 ? JSON.stringify(allowed_domains) : null;

  try {
    const info = db.prepare('INSERT INTO codes (code, label, max_usage, expires_at, allowed_domains) VALUES (?, ?, ?, ?, ?)')
      .run(code.trim(), label || null, maxUsageValue, expiresValue, allowedJson);
    logActivity('code.create',
      `${code.trim()}${maxUsageValue ? ` (max ${maxUsageValue})` : ''}${expiresValue ? ` (exp ${expiresValue})` : ''}${allowedJson ? ` (${JSON.parse(allowedJson).length} domain)` : ''}`,
      req
    );
    const allowedList = allowedJson ? JSON.parse(allowedJson).join(', ') : 'Semua domain';
    notifyTelegram(
      `<b>KODE UNIK BARU</b>\n\n<blockquote>Kode: ${esc(maskCode(code.trim()))}\nLabel: ${esc(label || '-')}\nBatas pakai: ${esc(maxUsageValue ?? 'Unlimited')}\nKadaluarsa: ${esc(expiresValue ? new Date(expiresValue).toLocaleString('id-ID') : 'Tidak ada')}\nWhitelist: ${esc(allowedList)}</blockquote>`
    ).catch(() => {});
    res.json({ id: info.lastInsertRowid });
  } catch (e) { res.status(400).json({ error: 'Kode sudah digunakan' }); }
});

app.post('/api/admin/codes/:id/reset', auth, (req, res) => {
  const row = db.prepare('SELECT code FROM codes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Kode tidak ditemukan' });
  db.prepare('UPDATE codes SET usage_count = 0 WHERE id = ?').run(req.params.id);
  logActivity('code.reset', row.code, req);
  res.json({ success: true });
});

app.delete('/api/admin/codes/:id', auth, (req, res) => {
  const row = db.prepare('SELECT code FROM codes WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM codes WHERE id = ?').run(req.params.id);
  if (row) logActivity('code.delete', row.code, req);
  res.json({ success: true });
});


app.post('/api/admin/codes/cleanup', auth, async (req, res) => {
  try {
    const r = await cleanupExpiredCodes(req);
    res.json({ deleted: r.deleted, dnsDeleted: r.dnsDeleted, failed: r.failed });
  } catch (e) { res.status(500).json({ error: e.message || 'Internal error' }); }
});

app.get('/api/admin/domains', auth, (req, res) => {
  const rows = db.prepare('SELECT id, name, provider, zone_id, enabled FROM domains ORDER BY name').all();
  res.json(rows);
});

app.patch('/api/admin/domains/:id', auth, (req, res) => {
  const { enabled } = req.body || {};
  const row = db.prepare('SELECT name FROM domains WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE domains SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id);
  if (row) logActivity('domain.toggle', `${row.name} -> ${enabled ? 'aktif' : 'nonaktif'}`, req);
  res.json({ success: true });
});

app.get('/api/admin/status', auth, async (req, res) => {
  const domains = db.prepare('SELECT id, name, provider, zone_id, api_token, enabled FROM domains ORDER BY name').all();
  const results = await Promise.all(domains.map(async (d) => {
    const start = Date.now();
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${d.zone_id}`, { headers: { Authorization: `Bearer ${d.api_token}` } });
      const data = await r.json();
      return { id: d.id, name: d.name, enabled: !!d.enabled, ok: data.success === true, status: data.result?.status || 'unknown', latency: Date.now() - start, error: data.success ? null : (data.errors?.[0]?.message || 'Unknown error') };
    } catch (e) {
      return { id: d.id, name: d.name, enabled: !!d.enabled, ok: false, status: 'error', latency: Date.now() - start, error: e.message };
    }
  }));
  res.json(results);
});


app.get('/api/admin/subdomains', auth, (req, res) => {
  const { search, domain, type, from, to, sort } = req.query;

  const where = [];
  const params = [];

  if (search) {
    where.push('(subdomain LIKE ? OR domain LIKE ? OR content LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (domain && domain !== 'all') {
    where.push('domain = ?');
    params.push(domain);
  }
  if (type && type !== 'all') {
    where.push('type = ?');
    params.push(type);
  }
  if (from) {
    where.push('date(created_at) >= date(?)');
    params.push(from);
  }
  if (to) {
    where.push('date(created_at) <= date(?)');
    params.push(to);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  let orderSql = 'ORDER BY created_at DESC';
  if (sort === 'oldest') orderSql = 'ORDER BY created_at ASC';
  else if (sort === 'name') orderSql = 'ORDER BY subdomain ASC, domain ASC';
  else if (sort === 'name-desc') orderSql = 'ORDER BY subdomain DESC, domain DESC';
  else if (sort === 'type') orderSql = 'ORDER BY type ASC, created_at DESC';

  const rows = db.prepare(`SELECT * FROM subdomains ${whereSql} ${orderSql} LIMIT 500`).all(...params);
  res.json(rows);
});

app.delete('/api/admin/subdomains/:id', auth, async (req, res) => {
  try {
    const row = db.prepare(`SELECT s.*, d.zone_id, d.api_token FROM subdomains s JOIN domains d ON d.name = s.domain WHERE s.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Subdomain tidak ditemukan' });
    await cfDeleteRecord(row.zone_id, row.api_token, row.type, `${row.subdomain}.${row.domain}`);
    db.prepare('DELETE FROM subdomains WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM favorites WHERE subdomain_id = ?').run(req.params.id);
    logActivity('subdomain.delete', `${row.subdomain}.${row.domain}`, req);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || 'Internal error' }); }
});

app.get('/api/admin/stats', auth, (req, res) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = db.prepare("SELECT COUNT(*) as c FROM subdomains WHERE date(created_at) = ?").get(dateStr).c;
    days.push({ label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), date: dateStr, count });
  }
  const topDomains = db.prepare("SELECT domain, COUNT(*) as c FROM subdomains GROUP BY domain ORDER BY c DESC LIMIT 5").all();
  const topTypes = db.prepare("SELECT type, COUNT(*) as c FROM subdomains GROUP BY type ORDER BY c DESC").all();
  const totals = {
    subdomains: db.prepare('SELECT COUNT(*) c FROM subdomains').get().c,
    codes: db.prepare('SELECT COUNT(*) c FROM codes').get().c,
    domainsActive: db.prepare('SELECT COUNT(*) c FROM domains WHERE enabled = 1').get().c,
    domainsTotal: db.prepare('SELECT COUNT(*) c FROM domains').get().c,
    usageTotal: db.prepare('SELECT COALESCE(SUM(usage_count),0) c FROM codes').get().c
  };
  res.json({ days, topDomains, topTypes, totals });
});


const SYNC_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'CAA', 'SRV'];
const CF_BASE = 'https://api.cloudflare.com/client/v4/zones/';
const cfHeaders = (apiToken) => ({ Authorization: 'Bearer ' + apiToken, 'Content-Type': 'application/json' });

async function cfListAllRecords(zoneId, apiToken) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(CF_BASE + zoneId + '/dns_records?per_page=100&page=' + page, { headers: cfHeaders(apiToken) });
    const d = await r.json();
    if (!d.success) throw new Error(d.errors?.[0]?.message || 'Cloudflare API error');
    all.push(...(d.result || []));
    if (!d.result_info || page >= d.result_info.total_pages) break;
  }
  return all;
}

async function cfGetRecord(zoneId, apiToken, cfId) {
  const r = await fetch(CF_BASE + zoneId + '/dns_records/' + encodeURIComponent(cfId), { headers: cfHeaders(apiToken) });
  const d = await r.json();
  if (!d.success) throw new Error(d.errors?.[0]?.message || 'Record tidak ditemukan');
  return d.result;
}

async function cfRecordExists(zoneId, apiToken, type, fullName) {
  const r = await fetch(CF_BASE + zoneId + '/dns_records?type=' + encodeURIComponent(type) + '&name=' + encodeURIComponent(fullName), { headers: cfHeaders(apiToken) });
  const d = await r.json();
  if (!d.success) throw new Error(d.errors?.[0]?.message || 'Cloudflare API error');
  return (d.result || []).length > 0;
}


function syncLabel(fullName, domainName) {
  const n = String(fullName || '').toLowerCase();
  const suffix = '.' + String(domainName).toLowerCase();
  if (!n.endsWith(suffix)) return null;
  const label = n.slice(0, -suffix.length);
  return label && label.indexOf('.') === -1 ? label : null;
}


function isSyncCandidate(rec, domainName) {
  if (!SYNC_TYPES.includes(rec.type)) return false;
  const label = syncLabel(rec.name, domainName);
  if (!label) return false;
  return !BLACKLIST_NAMES.includes(label);
}

async function loadSyncRecord(domainId, cfId) {
  const d = db.prepare('SELECT * FROM domains WHERE id = ?').get(Number(domainId));
  if (!d) throw new Error('Domain tidak ditemukan');
  const rec = await cfGetRecord(d.zone_id, d.api_token, String(cfId));
  if (!isSyncCandidate(rec, d.name)) throw new Error('Bukan subdomain biasa / nama sistem');
  return { d, rec, label: syncLabel(rec.name, d.name) };
}

app.get('/api/admin/sync', auth, async (req, res) => {
  try {
    const domains = db.prepare('SELECT id, name, zone_id, api_token, enabled FROM domains ORDER BY name').all();
    const out = await Promise.all(domains.map(async (d) => {
      const info = { id: d.id, name: d.name, enabled: !!d.enabled };
      try {
        const recs = await cfListAllRecords(d.zone_id, d.api_token);
        const cfKeys = new Set(recs.map(r => (r.type + '|' + r.name).toLowerCase()));
        const dbRows = db.prepare('SELECT id, subdomain, domain, type, code_used, suspended FROM subdomains WHERE domain = ? COLLATE NOCASE').all(d.name);
        const keyOf = (s) => (s.type + '|' + s.subdomain + '.' + s.domain).toLowerCase();
        const dbKeys = new Set(dbRows.map(keyOf));
        info.cfTotal = recs.length;
        info.dbTotal = dbRows.length;
        info.missingInCf = dbRows.filter(s => !s.suspended && !cfKeys.has(keyOf(s)))
          .map(s => ({ id: s.id, name: s.subdomain + '.' + s.domain, type: s.type, code_used: s.code_used }));
        info.orphans = recs.filter(r => isSyncCandidate(r, d.name) && !dbKeys.has((r.type + '|' + r.name).toLowerCase()))
          .map(r => ({ cfId: r.id, name: r.name, type: r.type, content: r.content || JSON.stringify(r.data || {}) }));
      } catch (e) { info.error = e.message; }
      return info;
    }));
    res.json({ domains: out });
  } catch (e) { res.status(500).json({ error: e.message || 'Internal error' }); }
});


app.post('/api/admin/sync/db-remove', auth, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger).slice(0, 200) : [];
  if (!ids.length) return res.status(400).json({ error: 'Tidak ada item' });
  let removed = 0;
  let skipped = 0;
  for (const id of ids) {
    try {
      const row = db.prepare('SELECT s.*, d.zone_id, d.api_token FROM subdomains s LEFT JOIN domains d ON d.name = s.domain WHERE s.id = ?').get(id);
      if (!row || !row.zone_id || row.suspended) { skipped++; continue; }
      const exists = await cfRecordExists(row.zone_id, row.api_token, row.type, row.subdomain + '.' + row.domain);
      if (exists) { skipped++; continue; }
      db.prepare('DELETE FROM favorites WHERE subdomain_id = ?').run(id);
      db.prepare('DELETE FROM subdomains WHERE id = ?').run(id);
      logActivity('sync.db_remove', row.subdomain + '.' + row.domain, req);
      removed++;
    } catch (e) { skipped++; }
  }
  res.json({ success: true, removed, skipped });
});


app.post('/api/admin/sync/cf-remove', auth, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 200) : [];
  if (!items.length) return res.status(400).json({ error: 'Tidak ada item' });
  let removed = 0;
  let skipped = 0;
  for (const it of items) {
    try {
      const { d, rec, label } = await loadSyncRecord(it.domainId, it.cfId);
      const taken = db.prepare('SELECT id FROM subdomains WHERE subdomain = ? COLLATE NOCASE AND domain = ? COLLATE NOCASE AND type = ?').get(label, d.name, rec.type);
      if (taken) { skipped++; continue; }
      const del = await fetch(CF_BASE + d.zone_id + '/dns_records/' + rec.id, { method: 'DELETE', headers: cfHeaders(d.api_token) });
      const dd = await del.json();
      if (!dd.success) throw new Error(dd.errors?.[0]?.message || 'Gagal hapus');
      logActivity('sync.cf_remove', rec.type + ' ' + rec.name, req);
      removed++;
    } catch (e) { skipped++; }
  }
  res.json({ success: true, removed, skipped });
});


app.post('/api/admin/sync/import', auth, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 200) : [];
  if (!items.length) return res.status(400).json({ error: 'Tidak ada item' });
  let imported = 0;
  let skipped = 0;
  for (const it of items) {
    try {
      const { d, rec, label } = await loadSyncRecord(it.domainId, it.cfId);
      const taken = db.prepare('SELECT id FROM subdomains WHERE subdomain = ? COLLATE NOCASE AND domain = ? COLLATE NOCASE').get(label, d.name);
      if (taken) { skipped++; continue; }
      let stored = rec.content || '';
      if (rec.type === 'SRV') {
        const x = rec.data || {};
        stored = JSON.stringify({ priority: x.priority, weight: x.weight, port: x.port, target: x.target });
      } else if (rec.type === 'CAA') {
        const x = rec.data || {};
        stored = JSON.stringify({ flags: x.flags, tag: x.tag, value: x.value });
      }
      db.prepare('INSERT INTO subdomains (subdomain, domain, type, content, proxied, ttl, code_used) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(label, d.name, rec.type, stored, rec.proxied ? 1 : 0, rec.ttl || 1, null);
      logActivity('sync.import', rec.type + ' ' + rec.name, req);
      imported++;
    } catch (e) { skipped++; }
  }
  res.json({ success: true, imported, skipped });
});


async function cfFetchRecords(zoneId, apiToken, type, fullName) {
  const r = await fetch(CF_BASE + zoneId + '/dns_records?type=' + encodeURIComponent(type) + '&name=' + encodeURIComponent(fullName), { headers: cfHeaders(apiToken) });
  const d = await r.json();
  if (!d.success) throw new Error(d.errors?.[0]?.message || 'Cloudflare API error');
  return d.result || [];
}

const SUB_WITH_ZONE = 'SELECT s.*, d.zone_id, d.api_token FROM subdomains s LEFT JOIN domains d ON d.name = s.domain WHERE s.id = ?';


app.post('/api/admin/subdomains/:id/suspend', auth, async (req, res) => {
  try {
    const row = db.prepare(SUB_WITH_ZONE).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Subdomain tidak ditemukan' });
    if (row.suspended) return res.status(400).json({ error: 'Subdomain sudah disuspend' });
    if (!row.zone_id) return res.status(400).json({ error: 'Domain tidak ditemukan di DB' });
    const full = row.subdomain + '.' + row.domain;
    const reason = String(req.body?.reason || '').trim().slice(0, 200) || null;

    const recs = await cfFetchRecords(row.zone_id, row.api_token, row.type, full);
    const first = recs[0];
    const snap = first ? JSON.stringify({ type: first.type, name: first.name, content: first.content, ttl: first.ttl, proxied: first.proxied, priority: first.priority, data: first.data }) : null;
    for (const rec of recs) {
      const del = await fetch(CF_BASE + row.zone_id + '/dns_records/' + rec.id, { method: 'DELETE', headers: cfHeaders(row.api_token) });
      const dd = await del.json();
      if (!dd.success) throw new Error(dd.errors?.[0]?.message || 'Gagal menghapus record di Cloudflare');
    }
    db.prepare("UPDATE subdomains SET suspended = 1, suspend_reason = ?, suspended_at = datetime('now'), suspend_snapshot = ? WHERE id = ?").run(reason, snap, row.id);
    logActivity('subdomain.suspend', full + (reason ? ' (' + reason + ')' : ''), req);
    notifyTelegram('<b>SUBDOMAIN DISUSPEND</b>\n\n<blockquote>Nama: ' + esc(full) + '\nKode: ' + esc(maskCode(row.code_used)) + '\nAlasan: ' + esc(reason || '-') + '</blockquote>').catch(() => {});
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

app.post('/api/admin/subdomains/:id/unsuspend', auth, async (req, res) => {
  try {
    const row = db.prepare(SUB_WITH_ZONE).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Subdomain tidak ditemukan' });
    if (!row.suspended) return res.status(400).json({ error: 'Subdomain tidak sedang disuspend' });
    if (!row.zone_id) return res.status(400).json({ error: 'Domain tidak ditemukan di DB' });
    const full = row.subdomain + '.' + row.domain;

    let body = null;
    if (row.suspend_snapshot) { try { body = JSON.parse(row.suspend_snapshot); } catch (e) { body = null; } }
    if (!body) {
      body = { type: row.type, name: full, ttl: row.ttl || 1 };
      if (row.type === 'CAA' || row.type === 'SRV') {
        try { body.data = JSON.parse(row.content); } catch (e) { return res.status(400).json({ error: 'Data record rusak, tidak bisa dipulihkan' }); }
      } else {
        body.content = row.content;
        if (['A', 'AAAA', 'CNAME'].includes(row.type)) body.proxied = !!row.proxied;
        if (row.type === 'MX') body.priority = 10;
      }
    }
    for (const k of Object.keys(body)) { if (body[k] === undefined || body[k] === null) delete body[k]; }

    const r = await fetch(CF_BASE + row.zone_id + '/dns_records', { method: 'POST', headers: cfHeaders(row.api_token), body: JSON.stringify(body) });
    const d = await r.json();
    if (!d.success) return res.status(400).json({ error: d.errors?.[0]?.message || 'Cloudflare API error' });

    db.prepare('UPDATE subdomains SET suspended = 0, suspend_reason = NULL, suspended_at = NULL, suspend_snapshot = NULL WHERE id = ?').run(row.id);
    logActivity('subdomain.unsuspend', full, req);
    notifyTelegram('<b>SUBDOMAIN DIPULIHKAN</b>\n\n<blockquote>Nama: ' + esc(full) + '\nKode: ' + esc(maskCode(row.code_used)) + '</blockquote>').catch(() => {});
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});


app.post('/api/admin/codes/:id/block', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM codes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Kode tidak ditemukan' });
  const blocked = req.body?.blocked ? 1 : 0;
  db.prepare('UPDATE codes SET blocked = ? WHERE id = ?').run(blocked, row.id);
  logActivity(blocked ? 'code.block' : 'code.unblock', row.code, req);
  notifyTelegram('<b>' + (blocked ? 'KODE DIBLOKIR' : 'BLOKIR KODE DIBUKA') + '</b>\n\n<blockquote>Kode: ' + esc(maskCode(row.code)) + '</blockquote>').catch(() => {});
  res.json({ success: true, blocked });
});


app.post('/api/admin/codes/:id/extend', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM codes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Kode tidak ditemukan' });
  if (req.body?.unlimited === true) {
    db.prepare('UPDATE codes SET expires_at = NULL WHERE id = ?').run(row.id);
    logActivity('code.extend', row.code + ' -> tanpa masa berlaku', req);
    return res.json({ success: true, expires_at: null });
  }
  const days = Number(req.body?.days);
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    return res.status(400).json({ error: 'Jumlah hari harus 1 - 3650' });
  }
  const cur = row.expires_at ? new Date(row.expires_at).getTime() : NaN;
  const base = (!Number.isNaN(cur) && cur > Date.now()) ? cur : Date.now();
  const next = new Date(base + Math.round(days * 86400000)).toISOString();
  db.prepare('UPDATE codes SET expires_at = ? WHERE id = ?').run(next, row.id);
  logActivity('code.extend', row.code + ' +' + days + ' hari -> ' + next, req);
  res.json({ success: true, expires_at: next });
});

app.get('/api/admin/summary', auth, (req, res) => {
  const now = Date.now();
  const soon = now + 3 * 86400000;
  let expiring = 0;
  let expired = 0;
  let blocked = 0;
  for (const c of db.prepare('SELECT expires_at, blocked FROM codes').all()) {
    if (c.blocked) blocked++;
    if (c.expires_at) {
      const t = new Date(c.expires_at).getTime();
      if (!Number.isNaN(t)) {
        if (t <= now) expired++;
        else if (t <= soon) expiring++;
      }
    }
  }
  const suspendedSubs = db.prepare('SELECT COUNT(*) c FROM subdomains WHERE suspended = 1').get().c;
  const domainsOff = db.prepare('SELECT COUNT(*) c FROM domains WHERE enabled = 0').get().c;
  res.json({ expiring, expired, blocked, suspendedSubs, domainsOff });
});

app.get('/api/admin/logs', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200').all();
  res.json(rows);
});


app.post('/api/user/login', userLoginLimiter, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kode wajib diisi' });
  const row = db.prepare('SELECT * FROM codes WHERE code = ?').get(String(code).trim());
  const check = checkCodeValidity(row);
  if (!check.valid) {
    logActivity('user.login_fail', `${code} - ${check.reason}`, req);
    return res.status(401).json({ error: check.reason });
  }
  const token = jwt.sign({ user: true, code: row.code }, process.env.JWT_SECRET, { expiresIn: '7d' });
  setUserCookie(res, token);
  logActivity('user.login', `Kode: ${row.code}`, req);
  res.json({ success: true, code: row.code });
});

app.post('/api/user/logout', (req, res) => {
  clearUserCookie(res);
  res.json({ success: true });
});

app.get('/api/user/me', userAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM codes WHERE code = ?').get(req.userCode);
  if (!row) {
    clearUserCookie(res);
    return res.status(404).json({ error: 'Kode tidak ditemukan' });
  }
  const check = checkCodeValidity(row);
  if (!check.valid) {
    clearUserCookie(res);
    return res.status(401).json({ error: check.reason, invalid: true });
  }
  res.json({
    code: row.code, label: row.label, usage_count: row.usage_count, max_usage: row.max_usage,
    expires_at: row.expires_at, allowed_domains: parseAllowedDomains(row.allowed_domains),
    created_at: row.created_at, valid: check.valid,
    expires_in_ms: row.expires_at && !Number.isNaN(new Date(row.expires_at).getTime()) ? new Date(row.expires_at).getTime() - Date.now() : null
  });
});

app.get('/api/user/subdomains', userAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as favorited
    FROM subdomains s
    LEFT JOIN favorites f ON f.subdomain_id = s.id AND f.code = ?
    WHERE s.code_used = ?
    ORDER BY favorited DESC, s.created_at DESC
  `).all(req.userCode, req.userCode);
  res.json(rows);
});

app.get('/api/user/favorites', userAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, 1 as favorited, f.created_at as favorited_at
    FROM favorites f
    JOIN subdomains s ON s.id = f.subdomain_id
    WHERE f.code = ? AND s.code_used = ?
    ORDER BY f.created_at DESC
  `).all(req.userCode, req.userCode);
  res.json(rows);
});

app.post('/api/user/subdomains/:id/favorite', userAuth, (req, res) => {
  const subId = req.params.id;
  const sub = db.prepare('SELECT id FROM subdomains WHERE id = ? AND code_used = ?').get(subId, req.userCode);
  if (!sub) return res.status(404).json({ error: 'Subdomain tidak ditemukan' });
  const existing = db.prepare('SELECT id FROM favorites WHERE code = ? AND subdomain_id = ?').get(req.userCode, subId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    return res.json({ favorited: false });
  }
  db.prepare('INSERT INTO favorites (code, subdomain_id) VALUES (?, ?)').run(req.userCode, subId);
  res.json({ favorited: true });
});


app.patch('/api/user/subdomains/:id', userAuth, async (req, res) => {
  try {
    const { content, proxied, ttl } = req.body || {};

    const row = db.prepare(`
      SELECT s.*, d.zone_id, d.api_token
      FROM subdomains s
      JOIN domains d ON d.name = s.domain
      WHERE s.id = ? AND s.code_used = ?
    `).get(req.params.id, req.userCode);

    if (!row) return res.status(404).json({ error: 'Subdomain tidak ditemukan atau bukan milikmu' });
    if (row.suspended) return res.status(403).json({ error: 'Subdomain ini disuspend oleh admin' });

    const fullName = `${row.subdomain}.${row.domain}`;
    const patchBody = {};

    if (row.type === 'CAA' || row.type === 'SRV') {
      if (content !== undefined) {
        try {
          const parsed = JSON.parse(content);
          const dataErr = row.type === 'SRV'
            ? validateRecordInput({ type: 'SRV', srv: parsed })
            : validateRecordInput({ type: 'CAA', caa: parsed });
          if (dataErr) return res.status(400).json({ error: dataErr });
          patchBody.data = row.type === 'SRV'
            ? { priority: Number(parsed.priority) || 10, weight: Number(parsed.weight) || 0, port: Number(parsed.port), target: String(parsed.target).trim() }
            : { flags: Number(parsed.flags) || 0, tag: parsed.tag, value: String(parsed.value).trim() };
        } catch {
          return res.status(400).json({ error: 'Format data tidak valid' });
        }
      }
    } else {
      if (content !== undefined) {
        patchBody.content = String(content).trim();
        const contentErr = validateRecordInput({ type: row.type, content: patchBody.content });
        if (contentErr) return res.status(400).json({ error: contentErr });
      }
      if (['A', 'AAAA', 'CNAME'].includes(row.type) && proxied !== undefined) patchBody.proxied = !!proxied;
    }
    if (ttl !== undefined) {
      const ttlErr = validateTtl(ttl);
      if (ttlErr) return res.status(400).json({ error: ttlErr });
      patchBody.ttl = Number(ttl) || 1;
    }

    if (Object.keys(patchBody).length === 0) {
      return res.status(400).json({ error: 'Tidak ada perubahan' });
    }

    const result = await cfUpdateRecord(row.zone_id, row.api_token, row.type, fullName, patchBody);

    if (!result.success) {
      const msg = result.errors?.[0]?.message || result.error || 'Cloudflare API error';
      return res.status(400).json({ error: msg });
    }

    const newContent = patchBody.content
      || (patchBody.data ? JSON.stringify(patchBody.data) : row.content);
    const newProxied = patchBody.proxied !== undefined ? (patchBody.proxied ? 1 : 0) : row.proxied;
    const newTtl = patchBody.ttl !== undefined ? patchBody.ttl : row.ttl;

    db.prepare('UPDATE subdomains SET content = ?, proxied = ?, ttl = ? WHERE id = ?')
      .run(newContent, newProxied, newTtl, row.id);

    logActivity('subdomain.update_user', `${fullName} (${req.userCode})`, req);
    notifyTelegram(`<b>SUBDOMAIN DIEDIT (USER)</b>\n\n<blockquote>Nama: ${esc(fullName)}\nKode: ${esc(maskCode(req.userCode))}\nPerubahan: ${esc(JSON.stringify(patchBody))}</blockquote>`).catch(() => {});

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

app.delete('/api/user/subdomains/:id', userAuth, async (req, res) => {
  try {
    const row = db.prepare(`
      SELECT s.*, d.zone_id, d.api_token FROM subdomains s
      JOIN domains d ON d.name = s.domain
      WHERE s.id = ? AND s.code_used = ?
    `).get(req.params.id, req.userCode);
    if (!row) return res.status(404).json({ error: 'Subdomain tidak ditemukan atau bukan milikmu' });
    await cfDeleteRecord(row.zone_id, row.api_token, row.type, `${row.subdomain}.${row.domain}`);
    db.prepare('DELETE FROM subdomains WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM favorites WHERE subdomain_id = ?').run(req.params.id);
    logActivity('subdomain.delete_user', `${row.subdomain}.${row.domain} (${req.userCode})`, req);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message || 'Internal error' }); }
});


async function cfDeleteRecordStrict(zoneId, apiToken, type, fullName) {
  const r = await fetch(CF_BASE + zoneId + '/dns_records?type=' + encodeURIComponent(type) + '&name=' + encodeURIComponent(fullName), { headers: cfHeaders(apiToken) });
  const d = await r.json();
  if (!d.success) throw new Error(d.errors?.[0]?.message || 'Gagal membaca record Cloudflare');
  for (const rec of (d.result || [])) {
    const del = await fetch(CF_BASE + zoneId + '/dns_records/' + rec.id, { method: 'DELETE', headers: cfHeaders(apiToken) });
    const dd = await del.json();
    if (!dd.success) throw new Error(dd.errors?.[0]?.message || 'Gagal menghapus record Cloudflare');
  }
}

let cleanupRunning = false;


async function cleanupExpiredCodes(req) {
  const out = { deleted: 0, dnsDeleted: 0, failed: 0 };
  if (cleanupRunning) return out;
  cleanupRunning = true;
  try {
    const expired = db.prepare("SELECT code FROM codes WHERE expires_at IS NOT NULL AND datetime(expires_at) < datetime('now')").all();
    for (const row of expired) {
      const code = row.code;
      const subs = db.prepare('SELECT s.id, s.subdomain, s.domain, s.type, d.zone_id, d.api_token FROM subdomains s LEFT JOIN domains d ON d.name = s.domain WHERE s.code_used = ?').all(code);
      let ok = true;
      for (const s of subs) {
        const full = s.subdomain + '.' + s.domain;
        try {
          if (s.zone_id && s.api_token) await cfDeleteRecordStrict(s.zone_id, s.api_token, s.type, full);
          db.prepare('DELETE FROM favorites WHERE subdomain_id = ?').run(s.id);
          db.prepare('DELETE FROM subdomains WHERE id = ?').run(s.id);
          out.dnsDeleted++;
          logActivity('subdomain.expired_delete', full + ' (' + code + ')', req || null);
        } catch (e) {
          ok = false;
          out.failed++;
          logActivity('subdomain.expired_delete_fail', full + ': ' + e.message, req || null);
        }
      }
      if (ok) {
        db.prepare('DELETE FROM favorites WHERE code = ?').run(code);
        db.prepare('DELETE FROM codes WHERE code = ?').run(code);
        out.deleted++;
      }
    }
    if (out.deleted || out.failed) {
      logActivity('code.auto_cleanup', out.deleted + ' kode expired dihapus, ' + out.dnsDeleted + ' DNS dibersihkan, ' + out.failed + ' gagal', req || null);
    }
  } finally { cleanupRunning = false; }
  return out;
}

const cleanupIntervalMin = Number(process.env.AUTO_CLEANUP_INTERVAL_MINUTES || 0);
if (cleanupIntervalMin > 0) {
  setInterval(() => {
    cleanupExpiredCodes(null).catch(e => console.error('[cleanup] error:', e.message));
  }, cleanupIntervalMin * 60 * 1000);
  console.log('[cleanup] Auto-cleanup aktif setiap ' + cleanupIntervalMin + ' menit');
}


const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '..', '..', 'subforge-backups');
const BACKUP_INTERVAL_HOURS = Number(process.env.BACKUP_INTERVAL_HOURS ?? 24);
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP ?? 7);

async function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + '-' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
  const file = path.join(BACKUP_DIR, 'subforge-' + stamp + '.db');
  await db.backup(file);
  const files = fs.readdirSync(BACKUP_DIR).filter(f => /^subforge-\d{8}-\d{6}\.db$/.test(f)).sort().reverse();
  for (const f of files.slice(BACKUP_KEEP)) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {}
  }
  return file;
}

if (BACKUP_INTERVAL_HOURS > 0) {
  const doBackup = () => runBackup()
    .then(f => console.log('[backup] ' + f))
    .catch(e => console.error('[backup] gagal:', e.message));
  setTimeout(doBackup, 30 * 1000);
  setInterval(doBackup, BACKUP_INTERVAL_HOURS * 60 * 60 * 1000);
  console.log('[backup] aktif tiap ' + BACKUP_INTERVAL_HOURS + ' jam -> ' + BACKUP_DIR + ' (simpan ' + BACKUP_KEEP + ' terbaru)');
}


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend jalan di http://localhost:${PORT}`));
