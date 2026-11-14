const encoder = new TextEncoder();
const DAY = 86_400_000;
const SESSION_MS = 30 * DAY;
const MAX_UPLOAD = 2_000_000;
const OPTIONS = [
  { id: 'gp-1', category: 'Google Play', coinsRequired: 4800, amount: '₹15' },
  { id: 'gp-2', category: 'Google Play', coinsRequired: 9600, amount: '₹30' },
  { id: 'az-1', category: 'Amazon', coinsRequired: 4800, amount: '₹15' },
  { id: 'imps-1', category: 'IMPS', coinsRequired: 8000, amount: '₹25' },
  { id: 'pp-1', category: 'PayPal', coinsRequired: 128000, amount: '$5' },
];
const PRIZES = [
  { id: 'coins-50', kind: 'coins', amount: 50 }, { id: 'coins-100', kind: 'coins', amount: 100 },
  { id: 'coins-250', kind: 'coins', amount: 250 }, { id: 'gems-5', kind: 'diamonds', amount: 5 },
  { id: 'coins-500', kind: 'coins', amount: 500 }, { id: 'gems-10', kind: 'diamonds', amount: 10 },
  { id: 'gems-25', kind: 'diamonds', amount: 25 }, { id: 'jackpot', kind: 'coins', amount: 2500 },
];
const DEFAULT_SETTINGS = { online: true, stealth: false, graphics: 'auto', fps: 60, privateProfile: false, twoStep: false, rewardAlerts: true };
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const now = () => new Date().toISOString();
const day = () => now().slice(0, 10);
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const safeJson = value => { try { return JSON.parse(value); } catch { return null; } };
const settingsOf = user => ({ ...DEFAULT_SETTINGS, ...(safeJson(user.settings_json) || {}), twoStep: Boolean(user.two_step_secret) });
const avatarUrl = (user, request) => user.avatar_key ? `${new URL(request.url).origin}/api/files/avatar/${encodeURIComponent(user.avatar_key)}` : null;
const publicUser = (user, request) => ({ id: user.id, userId: user.gamer_id, gamerId: user.gamer_id, name: user.name,
  email: user.email, avatarUrl: avatarUrl(user, request), dateJoined: user.joined_at, level: user.level, tier: user.tier,
  inviteCode: user.invite_code, settings: settingsOf(user) });

function json(data, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, x-admin-key',
    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
    'x-content-type-options': 'nosniff',
  } });
}
async function inputJson(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) fail(415, 'CONTENT_TYPE', 'JSON body required');
  if (Number(request.headers.get('content-length') || 0) > 16_384) fail(413, 'TOO_LARGE', 'Request is too large');
  try { const value = await request.json(); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { fail(400, 'INVALID_JSON', 'Invalid JSON body'); }
}
async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) fail(503, 'TURNSTILE_UNAVAILABLE', 'Authentication is temporarily unavailable');
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) fail(400, 'TURNSTILE_REQUIRED', 'Complete the security check to continue');
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY); body.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP'); if (ip) body.set('remoteip', ip);
  let result;
  try { const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body }); result = response.ok ? await response.json() : null; }
  catch { fail(503, 'TURNSTILE_UNAVAILABLE', 'Authentication is temporarily unavailable'); }
  if (!result?.success) fail(401, 'TURNSTILE_FAILED', 'Security check failed. Please try again');
}
async function sha256(value) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100_000 }, key, 256)));
}
function equalHex(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0; for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
function encode32(bytes) {
  let value = 0, bits = 0, result = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) result += BASE32[(value >>> (bits -= 5)) & 31]; }
  if (bits) result += BASE32[(value << (5 - bits)) & 31];
  return result;
}
function decode32(value) {
  let bits = 0, n = 0; const result = [];
  for (const char of value.toUpperCase()) { const digit = BASE32.indexOf(char); if (digit < 0) return new Uint8Array(); n = (n << 5) | digit; bits += 5; if (bits >= 8) result.push((n >>> (bits -= 8)) & 255); }
  return new Uint8Array(result);
}
async function totp(secret, counter) {
  const key = await crypto.subtle.importKey('raw', decode32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const data = new DataView(new ArrayBuffer(8)); data.setBigUint64(0, BigInt(counter));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  const offset = mac[19] & 15;
  return (((mac[offset] & 127) << 24 | mac[offset + 1] << 16 | mac[offset + 2] << 8 | mac[offset + 3]) % 1_000_000).toString().padStart(6, '0');
}
async function validTotp(secret, code) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const counter = Math.floor(Date.now() / 30_000);
  for (const offset of [-1, 0, 1]) if (await totp(secret, counter + offset) === String(code)) return true;
  return false;
}
async function secretKey(env) {
  if (!env.TWO_STEP_ENCRYPTION_KEY) throw new Error('TWO_STEP_ENCRYPTION_KEY is not configured');
  const raw = Uint8Array.from(atob(env.TWO_STEP_ENCRYPTION_KEY), char => char.charCodeAt(0));
  if (raw.length !== 32) throw new Error('TWO_STEP_ENCRYPTION_KEY must be 32 bytes');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encryptSecret(env, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await secretKey(env), encoder.encode(secret)));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...ciphertext))}`;
}
async function decryptSecret(env, value) {
  const [iv, ciphertext] = String(value).split('.');
  if (!iv || !ciphertext) throw new Error('Invalid encrypted secret');
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(iv), char => char.charCodeAt(0)) },
    await secretKey(env), Uint8Array.from(atob(ciphertext), char => char.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}
async function one(db, sql, ...args) { return db.prepare(sql).bind(...args).first(); }
async function all(db, sql, ...args) { return (await db.prepare(sql).bind(...args).all()).results; }
async function run(db, sql, ...args) { return db.prepare(sql).bind(...args).run(); }
async function auth(request, env) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) fail(401, 'AUTH_REQUIRED', 'Please sign in');
  const hash = await sha256(token);
  const user = await one(env.DB, 'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?', hash, Date.now());
  if (!user) fail(401, 'AUTH_REQUIRED', 'Session expired. Please sign in');
  return { user, hash };
}
async function adminAuth(request, env) {
  const supplied = request.headers.get('x-admin-key') || '';
  if (!env.REDEMPTION_ADMIN_KEY || !supplied || !equalHex(await sha256(supplied), await sha256(env.REDEMPTION_ADMIN_KEY)))
    fail(401, 'ADMIN_REQUIRED', 'Admin key required');
}
async function session(env, user) {
  const token = randomHex(32);
  await run(env.DB, 'INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', await sha256(token), user.id, Date.now() + SESSION_MS);
  return token;
}
async function recordAuthFailure(env, key) {
  const time = Date.now();
  await run(env.DB, 'INSERT INTO auth_attempts (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start < ? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END', key, time, time - 15 * 60_000, time - 15 * 60_000);
}
async function reward(env, userId, kind, amount, source, key = null) {
  const id = crypto.randomUUID();
  const result = await run(env.DB, 'INSERT OR IGNORE INTO rewards (id,user_id,kind,amount,source,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?)',
    id, userId, kind, amount, source, key, now());
  return result.meta.changes ? { id, kind, amount, source, at: now() } : null;
}
function badges(stats) {
  return [
    { id: 'first-game', title: 'First Game', earned: stats.gamesPlayed > 0 },
    { id: 'regular', title: 'Regular Player', earned: stats.gamesPlayed >= 5 },
    { id: 'collector', title: 'Coin Collector', earned: stats.coins >= 10000 },
    { id: 'ambassador', title: 'Ambassador', earned: stats.referrals > 0 },
  ];
}
async function missionState(env, user) {
  const d = day();
  const [plays, refs, login] = await Promise.all([
    one(env.DB, 'SELECT COUNT(*) AS n FROM plays WHERE user_id=? AND substr(claimed_at,1,10)=?', user.id, d),
    one(env.DB, 'SELECT COUNT(*) AS n FROM referrals WHERE inviter_id=?', user.id),
    one(env.DB, 'SELECT id FROM rewards WHERE idempotency_key=?', `daily:${user.id}:${d}`),
  ]);
  const missions = [
    { id: 'daily-login', title: 'Daily check-in', target: 1, progress: login ? 1 : 0, reward: 50 },
    { id: 'play-one', title: 'Play one game', target: 1, progress: Math.min(1, plays.n), reward: 75 },
    { id: 'play-three', title: 'Play three games', target: 3, progress: Math.min(3, plays.n), reward: 150 },
    { id: 'invite-friend', title: 'Invite a friend', target: 1, progress: Math.min(1, refs.n), reward: 200 },
  ];
  const missionPrefix = `mission:${user.id}:${d}:`;
  const claimed = await all(env.DB, 'SELECT idempotency_key FROM rewards WHERE user_id=? AND substr(idempotency_key,1,?)=?', user.id, missionPrefix.length, missionPrefix);
  const keys = new Set(claimed.map(r => r.idempotency_key));
  return missions.map(m => ({ ...m, claimed: keys.has(`mission:${user.id}:${d}:${m.id}`) }));
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (method === 'OPTIONS') return json(null, 204);
  if (path === '/api/health') return json({ ok: true, storage: 'D1', files: 'R2' });
  if (path.startsWith('/api/files/avatar/') && method === 'GET') {
    const key = decodeURIComponent(path.slice('/api/files/avatar/'.length));
    if (!/^avatars\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key)) fail(404, 'NOT_FOUND', 'File not found');
    const file = await env.FILES.get(key);
    if (!file) fail(404, 'NOT_FOUND', 'File not found');
    return new Response(file.body, { headers: { 'content-type': file.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff' } });
  }
  if (path === '/api/admin/redemptions' && method === 'GET') {
    await adminAuth(request, env);
    const status = url.searchParams.get('status') || 'pending';
    if (!['pending', 'fulfilled', 'rejected'].includes(status)) fail(400, 'INVALID_STATUS', 'Invalid redemption status');
    const claims = await all(env.DB, 'SELECT r.id,r.option_id,r.category,r.amount,r.coins_cost,r.status,r.created_at,u.email,u.gamer_id FROM redemptions r JOIN users u ON u.id=r.user_id WHERE r.status=? ORDER BY r.created_at ASC LIMIT 100', status);
    return json({ claims });
  }
  if (path.startsWith('/api/admin/redemptions/') && method === 'PATCH') {
    await adminAuth(request, env);
    const id = path.slice('/api/admin/redemptions/'.length);
    if (!/^[a-f0-9-]{36}$/.test(id)) fail(400, 'INVALID_ID', 'Invalid redemption ID');
    const input = await inputJson(request);
    if (!['fulfilled', 'rejected'].includes(input.status)) fail(400, 'INVALID_STATUS', 'Choose fulfilled or rejected');
    const at = now();
    const statements = [env.DB.prepare("UPDATE redemptions SET status=? WHERE id=? AND status='pending'").bind(input.status, id)];
    if (input.status === 'rejected') statements.push(env.DB.prepare("INSERT OR IGNORE INTO rewards (id,user_id,kind,amount,source,idempotency_key,created_at) SELECT ?,user_id,'coins',coins_cost,'Redemption refund',?,? FROM redemptions WHERE id=? AND status='rejected'").bind(crypto.randomUUID(), `refund:${id}`, at, id));
    const result = await env.DB.batch(statements);
    if (!result[0].meta.changes) fail(409, 'NOT_PENDING', 'Redemption is not pending');
    return json({ id, status: input.status });
  }
  if (path === '/api/auth/register' && method === 'POST') {
    const input = await inputJson(request);
    await verifyTurnstile(request, env, input.turnstileToken);
    const signupKey = await sha256(`signup:${request.headers.get('CF-Connecting-IP') || 'local'}`);
    const signupAttempt = await one(env.DB, 'SELECT * FROM auth_attempts WHERE key=?', signupKey);
    if (signupAttempt && signupAttempt.window_start > Date.now() - 3_600_000 && signupAttempt.attempts >= 5) fail(429, 'SIGNUP_LIMIT', 'Too many new accounts. Try again later');
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    const name = String(input.name || '').trim().slice(0, 40);
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !name) fail(400, 'INVALID_INPUT', 'Enter a name, valid email, and password of at least 10 characters');
    const inviter = input.inviteCode ? await one(env.DB, 'SELECT id FROM users WHERE invite_code=?', String(input.inviteCode).trim().toUpperCase()) : null;
    if (input.inviteCode && !inviter) fail(400, 'INVALID_INVITE', 'Invite code not found');
    const id = crypto.randomUUID(); const salt = randomHex(16); const joined = now();
    const gamerId = `PL-${randomHex(5).toUpperCase()}`; const inviteCode = randomHex(5).toUpperCase();
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users (id,email,password_salt,password_hash,name,gamer_id,invite_code,invited_by,joined_at,settings_json) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .bind(id, email, salt, await passwordHash(password, salt), name, gamerId, inviteCode, inviter?.id || null, joined, JSON.stringify(DEFAULT_SETTINGS)),
        ...(inviter ? [env.DB.prepare('INSERT INTO referrals (id,inviter_id,invitee_id,created_at) VALUES (?,?,?,?)').bind(crypto.randomUUID(), inviter.id, id, joined)] : []),
      ]);
    } catch (err) { if (String(err).includes('UNIQUE')) fail(409, 'EMAIL_TAKEN', 'Email is already registered'); throw err; }
    await run(env.DB, 'INSERT INTO auth_attempts (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start < ? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END', signupKey, Date.now(), Date.now() - 3_600_000, Date.now() - 3_600_000);
    const user = await one(env.DB, 'SELECT * FROM users WHERE id=?', id);
    return json({ token: await session(env, user), user: publicUser(user, request) }, 201);
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const input = await inputJson(request);
    await verifyTurnstile(request, env, input.turnstileToken);
    const email = String(input.email || '').trim().toLowerCase();
    const limiterKey = await sha256(`${request.headers.get('CF-Connecting-IP') || 'unknown'}:${email}`);
    const attempt = await one(env.DB, 'SELECT * FROM auth_attempts WHERE key=?', limiterKey);
    if (attempt && attempt.window_start > Date.now() - 15 * 60_000 && attempt.attempts >= 8) fail(429, 'TOO_MANY_ATTEMPTS', 'Too many sign-in attempts. Try again later');
    const user = await one(env.DB, 'SELECT * FROM users WHERE email=?', email);
    const expected = user ? user.password_hash : await passwordHash(String(input.password || ''), 'invalid-login-salt');
    const actual = await passwordHash(String(input.password || ''), user?.password_salt || 'invalid-login-salt');
    if (!user || !equalHex(actual, expected)) {
      await recordAuthFailure(env, limiterKey);
      fail(401, 'BAD_LOGIN', 'Invalid email or password');
    }
    if (user.two_step_secret && !(await validTotp(await decryptSecret(env, user.two_step_secret), input.code))) {
      await recordAuthFailure(env, limiterKey);
      fail(401, 'TWO_STEP_REQUIRED', 'Enter the six-digit code from your authenticator');
    }
    await run(env.DB, 'DELETE FROM auth_attempts WHERE key=?', limiterKey);
    return json({ token: await session(env, user), user: publicUser(user, request) });
  }
  const { user, hash: tokenHash } = await auth(request, env);
  if (path === '/api/auth/logout' && method === 'POST') { await run(env.DB, 'DELETE FROM sessions WHERE token_hash=?', tokenHash); return json({ ok: true }); }
  if (path === '/api/auth/me' && method === 'GET') return json(publicUser(user, request));
  if (path === '/api/profile' && method === 'GET') {
    const [played, earned, referrals, recent] = await Promise.all([
      one(env.DB, 'SELECT COUNT(*) AS n FROM plays WHERE user_id=? AND claimed_at IS NOT NULL', user.id),
      one(env.DB, 'SELECT COUNT(*) AS n FROM rewards WHERE user_id=?', user.id),
    one(env.DB, 'SELECT COUNT(*) AS n FROM referrals r WHERE inviter_id=? AND EXISTS (SELECT 1 FROM plays p WHERE p.user_id=r.invitee_id AND p.claimed_at IS NOT NULL)', user.id),
      all(env.DB, 'SELECT game_code AS gameCode,title,seconds,claimed_at AS at FROM plays WHERE user_id=? AND claimed_at IS NOT NULL ORDER BY claimed_at DESC LIMIT 5', user.id),
    ]);
    const stats = { gamesPlayed: played.n, rewardsEarned: earned.n, wins: 0, coins: user.coins, referrals: referrals.n };
    return json({ ...publicUser(user, request), stats, recentGames: recent, badges: badges(stats) });
  }
  if (path === '/api/profile' && method === 'PATCH') {
    const input = await inputJson(request); const name = String(input.name || '').trim().slice(0, 40);
    if (!name) fail(400, 'INVALID_NAME', 'Enter a gamer name');
    await run(env.DB, 'UPDATE users SET name=? WHERE id=?', name, user.id);
    return json(publicUser({ ...user, name }, request));
  }
  if (path === '/api/settings' && method === 'GET') return json(settingsOf(user));
  if (path === '/api/settings' && method === 'PATCH') {
    const input = await inputJson(request); const next = settingsOf(user);
    for (const key of ['online', 'stealth', 'privateProfile', 'rewardAlerts']) if (key in input) next[key] = Boolean(input[key]);
    if (['auto', 'low', 'medium', 'high'].includes(input.graphics)) next.graphics = input.graphics;
    if ([30, 60, 90, 120].includes(Number(input.fps))) next.fps = Number(input.fps);
    next.twoStep = Boolean(user.two_step_secret);
    await run(env.DB, 'UPDATE users SET settings_json=? WHERE id=?', JSON.stringify(next), user.id);
    return json(next);
  }
  if (path === '/api/settings/two-step/setup' && method === 'POST') {
    if (user.two_step_secret) fail(409, 'ALREADY_ENABLED', 'Two-step authentication is already enabled');
    const secret = encode32(crypto.getRandomValues(new Uint8Array(20)));
    await run(env.DB, 'UPDATE users SET pending_two_step_secret=? WHERE id=?', await encryptSecret(env, secret), user.id);
    return json({ secret, uri: `otpauth://totp/Playloot:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Playloot` });
  }
  if (path === '/api/settings/two-step/enable' && method === 'POST') {
    const input = await inputJson(request);
    if (!user.pending_two_step_secret || !(await validTotp(await decryptSecret(env, user.pending_two_step_secret), input.code))) fail(400, 'INVALID_CODE', 'Authenticator code is incorrect');
    await run(env.DB, 'UPDATE users SET two_step_secret=pending_two_step_secret,pending_two_step_secret=NULL WHERE id=?', user.id);
    return json({ enabled: true });
  }
  if (path === '/api/settings/two-step/disable' && method === 'POST') {
    const input = await inputJson(request);
    if (!user.two_step_secret || !(await validTotp(await decryptSecret(env, user.two_step_secret), input.code))) fail(400, 'INVALID_CODE', 'Authenticator code is incorrect');
    await run(env.DB, 'UPDATE users SET two_step_secret=NULL WHERE id=?', user.id);
    return json({ enabled: false });
  }
  if (path === '/api/wallet' && method === 'GET') return json({ coins: user.coins, diamonds: user.diamonds, cash: user.cash });
  if (path === '/api/rewards' && method === 'GET') {
    const [rewards, claims] = await Promise.all([
      all(env.DB, 'SELECT id,kind,amount,source,created_at AS at FROM rewards WHERE user_id=? ORDER BY created_at DESC LIMIT 100', user.id),
      all(env.DB, 'SELECT id,option_id,category,amount,coins_cost,status,created_at AS at FROM redemptions WHERE user_id=? ORDER BY created_at DESC LIMIT 50', user.id),
    ]);
    return json({ rewards, claims: claims.map(c => ({ ...c, option: { id: c.option_id, category: c.category, amount: c.amount, coinsRequired: c.coins_cost } })) });
  }
  if (path === '/api/notifications' && method === 'GET') {
    const items = await all(env.DB, 'SELECT id,kind,amount,source,created_at AS at FROM rewards WHERE user_id=? ORDER BY created_at DESC LIMIT 15', user.id);
    return json({ items: items.map(r => ({ id: r.id, text: `${r.source}: +${r.amount} ${r.kind}`, at: r.at })) });
  }
  if (path === '/api/daily' && method === 'GET') {
    const claimed = await one(env.DB, 'SELECT id FROM rewards WHERE idempotency_key=?', `daily:${user.id}:${day()}`);
    return json({ claimed: Boolean(claimed), nextAvailableAt: new Date(Date.now() + DAY).toISOString() });
  }
  if (path === '/api/daily/claim' && method === 'POST') {
    const earned = await reward(env, user.id, 'coins', 50, 'Daily check-in', `daily:${user.id}:${day()}`);
    if (!earned) fail(409, 'ALREADY_CLAIMED', 'Daily bonus already claimed');
    const wallet = await one(env.DB, 'SELECT coins,diamonds FROM users WHERE id=?', user.id);
    return json({ reward: earned, wallet });
  }
  if (path === '/api/missions' && method === 'GET') return json({ missions: await missionState(env, user) });
  if (path === '/api/missions/claim' && method === 'POST') {
    const input = await inputJson(request); const mission = (await missionState(env, user)).find(m => m.id === input.id);
    if (!mission) fail(404, 'NOT_FOUND', 'Mission not found');
    if (mission.progress < mission.target || mission.claimed) fail(409, 'NOT_READY', 'Mission is not ready to claim');
    const earned = await reward(env, user.id, 'coins', mission.reward, mission.title, `mission:${user.id}:${day()}:${mission.id}`);
    if (!earned) fail(409, 'ALREADY_CLAIMED', 'Mission already claimed');
    return json({ reward: earned, missions: await missionState(env, user) });
  }
  if (path === '/api/invite' && method === 'GET') {
    const referrals = await one(env.DB, 'SELECT COUNT(*) AS n FROM referrals WHERE inviter_id=?', user.id);
    return json({ code: user.invite_code, referrals: referrals.n, rewardPerInvite: 200 });
  }
  if (path === '/api/leaderboard' && method === 'GET') {
    const rows = await all(env.DB, "SELECT name,coins,diamonds,level,tier,gamer_id FROM users WHERE json_extract(settings_json,'$.privateProfile') != 1 AND json_extract(settings_json,'$.stealth') != 1 ORDER BY coins DESC, joined_at ASC LIMIT 100");
    const rank = await one(env.DB, "SELECT COUNT(*) + 1 AS n FROM users WHERE coins > ? AND json_extract(settings_json,'$.privateProfile') != 1 AND json_extract(settings_json,'$.stealth') != 1", user.coins);
    const total = await one(env.DB, "SELECT COUNT(*) AS n FROM users WHERE json_extract(settings_json,'$.privateProfile') != 1 AND json_extract(settings_json,'$.stealth') != 1");
    const privateUser = settingsOf(user).privateProfile || settingsOf(user).stealth;
    return json({ players: rows.map((r, i) => ({ rank: i + 1, name: r.name, coins: r.coins, diamonds: r.diamonds, level: r.level, tier: r.tier, gamerId: r.gamer_id })), totalPlayers: total.n,
      me: { ...publicUser(user, request), rank: privateUser ? 0 : rank.n, coins: user.coins } });
  }
  if (path === '/api/redeem/options' && method === 'GET') return json({ options: OPTIONS });
  if (path === '/api/redeem' && method === 'POST') {
    const input = await inputJson(request); const option = OPTIONS.find(o => o.id === input.optionId);
    if (!option) fail(404, 'NOT_FOUND', 'Reward option not found');
    const id = crypto.randomUUID(); const at = now();
    try { await run(env.DB, 'INSERT INTO redemptions (id,user_id,option_id,category,amount,coins_cost,status,created_at) VALUES (?,?,?,?,?,?,?,?)', id, user.id, option.id, option.category, option.amount, option.coinsRequired, 'pending', at); }
    catch (err) { if (String(err).includes('INSUFFICIENT_COINS')) fail(409, 'INSUFFICIENT_COINS', 'Not enough coins'); if (String(err).includes('DAILY_LIMIT')) fail(429, 'DAILY_LIMIT', 'Daily redemption limit reached'); throw err; }
    const wallet = await one(env.DB, 'SELECT coins FROM users WHERE id=?', user.id);
    return json({ claim: { id, option, status: 'pending', at }, coins: wallet.coins }, 201);
  }
  if (path === '/api/games/play/start' && method === 'POST') {
    const input = await inputJson(request); const gameCode = String(input.gameCode || '').trim().slice(0, 100);
    if (!gameCode) fail(400, 'INVALID_INPUT', 'Game code is required');
    const active = await one(env.DB, 'SELECT COUNT(*) AS n FROM plays WHERE user_id=? AND claimed_at IS NULL AND started_at>?', user.id, Date.now() - 3_600_000);
    if (active.n >= 3) fail(429, 'TOO_MANY_SESSIONS', 'Close or claim an active game first');
    const id = crypto.randomUUID();
    await run(env.DB, 'INSERT INTO plays (id,user_id,game_code,title,started_at) VALUES (?,?,?,?,?)', id, user.id, gameCode, String(input.title || 'Game').slice(0, 100), Date.now());
    return json({ sessionId: id }, 201);
  }
  if (path === '/api/games/play/claim' && method === 'POST') {
    const input = await inputJson(request);
    const play = await one(env.DB, 'SELECT * FROM plays WHERE id=? AND user_id=?', String(input.sessionId || ''), user.id);
    if (!play || play.claimed_at) fail(409, 'INVALID_SESSION', 'Play session unavailable');
    const seconds = Math.floor((Date.now() - play.started_at) / 1000);
    if (seconds < 120) fail(409, 'TOO_EARLY', 'Play for at least two minutes to claim');
    const rewardedSeconds = Math.min(seconds, 7200);
    const claimedToday = await one(env.DB, 'SELECT COUNT(*) AS n FROM plays WHERE user_id=? AND substr(claimed_at,1,10)=?', user.id, day());
    if (claimedToday.n >= 10) fail(429, 'DAILY_LIMIT', 'Daily play reward limit reached');
    const coinsAwarded = Math.floor((rewardedSeconds - 120) / 60) * 10;
    const at = now();
    const result = await env.DB.batch([
      env.DB.prepare('UPDATE plays SET claimed_at=?,seconds=?,coins_awarded=? WHERE id=? AND user_id=? AND claimed_at IS NULL AND (SELECT COUNT(*) FROM plays WHERE user_id=? AND substr(claimed_at,1,10)=?)<10').bind(at, rewardedSeconds, coinsAwarded, play.id, user.id, user.id, day()),
      env.DB.prepare('INSERT INTO rewards (id,user_id,kind,amount,source,idempotency_key,created_at) SELECT ?,?,?,?,?,?,? FROM plays WHERE id=? AND user_id=? AND claimed_at=? AND ?>0')
        .bind(crypto.randomUUID(), user.id, 'coins', coinsAwarded, `Played ${play.title}`, `play:${play.id}`, at, play.id, user.id, at, coinsAwarded),
      env.DB.prepare('INSERT OR IGNORE INTO rewards (id,user_id,kind,amount,source,idempotency_key,created_at) SELECT ?,r.inviter_id,?,?,?,?,? FROM referrals r WHERE r.invitee_id=? AND EXISTS (SELECT 1 FROM plays p WHERE p.user_id=? AND p.claimed_at IS NOT NULL)')
        .bind(crypto.randomUUID(), 'coins', 200, 'Referral', `referral:${user.id}`, at, user.id, user.id),
      env.DB.prepare('UPDATE users SET level=1+(SELECT COUNT(*)/5 FROM plays WHERE user_id=? AND claimed_at IS NOT NULL) WHERE id=?').bind(user.id, user.id),
    ]);
    if (!result[0].meta.changes) fail(409, 'INVALID_SESSION', 'Play session unavailable');
    const wallet = await one(env.DB, 'SELECT coins FROM users WHERE id=?', user.id);
    return json({ coinsAwarded, coins: wallet.coins });
  }
  if (path === '/api/spin' && method === 'GET') {
    const spun = await one(env.DB, 'SELECT id FROM rewards WHERE idempotency_key=?', `spin:${user.id}:${day()}`);
    return json({ alreadySpunToday: Boolean(spun) });
  }
  if (path === '/api/spin' && method === 'POST') {
    const prize = PRIZES[crypto.getRandomValues(new Uint32Array(1))[0] % PRIZES.length];
    const earned = await reward(env, user.id, prize.kind, prize.amount, 'Lucky spin', `spin:${user.id}:${day()}`);
    if (!earned) fail(409, 'ALREADY_SPUN', 'Daily spin already used');
    const wallet = await one(env.DB, 'SELECT coins,diamonds FROM users WHERE id=?', user.id);
    return json({ prize, wallet });
  }
  if (path === '/api/avatar' && method === 'POST') {
    const type = request.headers.get('content-type')?.split(';')[0];
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[type];
    if (!extension) fail(415, 'INVALID_FILE', 'Upload a PNG, JPEG, or WebP image');
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_UPLOAD) fail(413, 'TOO_LARGE', 'Image must be under 2 MB');
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_UPLOAD) fail(413, 'TOO_LARGE', 'Image must be under 2 MB');
    const valid = type === 'image/png' ? hex(bytes.slice(0, 8)) === '89504e470d0a1a0a'
      : type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!valid) fail(400, 'INVALID_FILE', 'Image content does not match its type');
    const key = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
    await env.FILES.put(key, bytes, { httpMetadata: { contentType: type } });
    try { await run(env.DB, 'UPDATE users SET avatar_key=? WHERE id=?', key, user.id); }
    catch (err) { await env.FILES.delete(key); throw err; }
    if (user.avatar_key) await env.FILES.delete(user.avatar_key).catch(() => {});
    return json({ avatarUrl: `${url.origin}/api/files/avatar/${encodeURIComponent(key)}` });
  }
  fail(404, 'NOT_FOUND', 'Endpoint not found');
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (err) {
      if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message } }, err.status);
      console.error(err);
      return json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }, 500);
    }
  },
};

export { handle, passwordHash, totp, validTotp };
