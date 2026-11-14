import http from 'node:http';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Reads `--flag value` or `--flag=value` from argv. */
function argValue(flag) {
  const argv = process.argv.slice(2);
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

const PORT = Number(process.env.PORT || argValue('--port') || 8787);
const DATA_FILE = resolve(process.env.PLAYLOOT_DATA_FILE || 'server/data.json');
const DAY = 86400000;
const prizes = [
  { id: 'coins-50', kind: 'coins', amount: 50 }, { id: 'coins-100', kind: 'coins', amount: 100 },
  { id: 'coins-250', kind: 'coins', amount: 250 }, { id: 'gems-5', kind: 'diamonds', amount: 5 },
  { id: 'coins-500', kind: 'coins', amount: 500 }, { id: 'gems-10', kind: 'diamonds', amount: 10 },
  { id: 'gems-25', kind: 'diamonds', amount: 25 }, { id: 'jackpot', kind: 'coins', amount: 2500 },
];
const options = [
  { id: 'gp-1', category: 'Google Play', coinsRequired: 4800, amount: '₹15' },
  { id: 'gp-2', category: 'Google Play', coinsRequired: 9600, amount: '₹30' },
  { id: 'az-1', category: 'Amazon', coinsRequired: 4800, amount: '₹15' },
  { id: 'imps-1', category: 'IMPS', coinsRequired: 8000, amount: '₹25' },
  { id: 'pp-1', category: 'PayPal', coinsRequired: 128000, amount: '$5' },
];
let db;
let saveQueue = Promise.resolve();
const SESSION_DAYS = 30;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes) {
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += ALPHABET[(value >>> (bits -= 5)) & 31]; } }
  if (bits) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
function decode32(secret) {
  let bits = 0, value = 0; const out = [];
  for (const char of secret.toUpperCase().replace(/=|\s/g, '')) { const n = ALPHABET.indexOf(char); if (n < 0) return Buffer.alloc(0); value = (value << 5) | n; bits += 5; if (bits >= 8) out.push((value >>> (bits -= 8)) & 255); }
  return Buffer.from(out);
}
function otp(secret, step) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decode32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}
function validOtp(secret, code) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const step = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some(d => otp(secret, step + d) === String(code));
}

function today() { return new Date().toISOString().slice(0, 10); }
function hash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function verify(password, saved) {
  const [salt, expected] = saved.split(':');
  const actual = Buffer.from(hash(password, salt).split(':')[1], 'hex');
  const target = Buffer.from(expected, 'hex');
  return actual.length === target.length && timingSafeEqual(actual, target);
}
function newUser(email, password, name) {
  return { id: randomUUID(), gamerId: `PL-${randomBytes(4).toString('hex').toUpperCase()}`, email: email.toLowerCase(),
    passwordHash: hash(password), name, joinedAt: new Date().toISOString(), coins: 2240, diamonds: 0, cash: 0,
    level: 1, tier: 'Bronze', avatarUrl: null, invitedBy: null, inviteCode: randomBytes(4).toString('hex').toUpperCase(),
    settings: { online: true, stealth: false, graphics: 'auto', fps: 60, privateProfile: false, twoStep: false, rewardAlerts: true },
    daily: {}, rewards: [], games: [], playSessions: {}, claims: [], referrals: [] };
}
async function save() {
  const snapshot = JSON.stringify(db, null, 2);
  saveQueue = saveQueue.then(async () => { await mkdir(dirname(DATA_FILE), { recursive: true }); await writeFile(DATA_FILE, snapshot); });
  await saveQueue;
}
async function init() {
  try { db = JSON.parse(await readFile(DATA_FILE, 'utf8')); }
  catch {
    // The demo account ships with a password printed in this file, so it is
    // never seeded outside local development.
    const users = process.env.NODE_ENV === 'production'
      ? []
      : [newUser('demo@playloot.gg', 'Playloot@123', 'Demo Player')];
    db = { users, sessions: {}, missions: [], matches: [] };
    await save();
  }
  db.sessions ||= {}; db.missions ||= []; db.matches ||= [];
}
async function createSession(user) {
  const token = randomBytes(32).toString('hex');
  db.sessions[token] = { userId: user.id, expiresAt: Date.now() + SESSION_DAYS * DAY };
  await save(); return token;
}
function publicUser(user) {
  return { id: user.id, userId: user.gamerId, gamerId: user.gamerId, name: user.name, email: user.email,
    avatarUrl: user.avatarUrl, dateJoined: user.joinedAt, level: user.level, tier: user.tier, inviteCode: user.inviteCode,
    settings: user.settings, badges: badges(user) };
}
function badges(user) {
  return [
    { id: 'first-game', title: 'First Game', earned: user.games.length > 0 },
    { id: 'regular', title: 'Regular Player', earned: user.games.length >= 5 },
    { id: 'collector', title: 'Coin Collector', earned: user.coins >= 10000 },
    { id: 'ambassador', title: 'Ambassador', earned: user.referrals.length > 0 },
  ];
}
function error(res, status, code, message) { json(res, status, { error: { code, message } }); }
function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' });
  res.end(JSON.stringify(value));
}
function addReward(user, kind, amount, source) {
  if (kind === 'diamonds') user.diamonds += amount; else user.coins += amount;
  const reward = { id: randomUUID(), kind, amount, source, at: new Date().toISOString() };
  user.rewards.unshift(reward);
  return reward;
}
function missionState(user) {
  const d = today();
  const played = user.games.filter(g => g.at?.startsWith(d)).length;
  return [
    { id: 'daily-login', title: 'Daily check-in', target: 1, progress: user.daily.checkIn === d ? 1 : 0, reward: 50 },
    { id: 'play-one', title: 'Play one game', target: 1, progress: Math.min(1, played), reward: 75 },
    { id: 'play-three', title: 'Play three games', target: 3, progress: Math.min(3, played), reward: 150 },
    { id: 'invite-friend', title: 'Invite a friend', target: 1, progress: Math.min(1, user.referrals.length), reward: 200 },
  ].map(m => ({ ...m, claimed: (user.daily.missionClaims || {})[m.id] === d }));
}
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 2_000_000) throw new Error('Request too large'); chunks.push(chunk); }
  const raw = Buffer.concat(chunks);
  return req.headers['content-type']?.includes('application/json') ? JSON.parse(raw.toString() || '{}') : raw;
}

// ---------------------------------------------------------------------------
// Cloudflare Turnstile
//
// Read from process.env on every call (not at import time) so tests and local
// runs can toggle enforcement without reloading the module.
// ---------------------------------------------------------------------------
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_MIN_TOKEN = 10;
const TURNSTILE_MAX_TOKEN = 2048;
const TURNSTILE_FALSY = new Set(['off', 'false', '0', 'no', 'disabled']);

export function turnstileConfig() {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
  const override = String(process.env.TURNSTILE_ENFORCE ?? '').trim().toLowerCase();
  const enforced = override ? !TURNSTILE_FALSY.has(override) : Boolean(secret);
  return {
    siteKey: String(process.env.TURNSTILE_SITE_KEY || '').trim(),
    // With no secret there is nothing to verify against, so the widget reports
    // as optional rather than rejecting every sign-in with a 503.
    required: enforced && Boolean(secret),
  };
}

export async function verifyTurnstile(req, input) {
  if (!turnstileConfig().required) return null;

  const token = input?.turnstileToken;
  if (typeof token !== 'string' || token.length < TURNSTILE_MIN_TOKEN || token.length > TURNSTILE_MAX_TOKEN) {
    return { status: 400, code: 'TURNSTILE_REQUIRED', message: 'Complete the security check to continue' };
  }

  const form = new FormData();
  form.set('secret', process.env.TURNSTILE_SECRET_KEY);
  form.set('response', token);
  const remoteIp = req.headers['cf-connecting-ip'] || req.socket?.remoteAddress;
  if (remoteIp) form.set('remoteip', remoteIp);

  let result;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    result = response.ok ? await response.json() : null;
  } catch {
    result = null;
  }

  // An unreachable verifier is not evidence that a human solved the widget.
  // Fail closed instead of waving the request through.
  if (!result) {
    return { status: 503, code: 'TURNSTILE_UNAVAILABLE', message: 'Security check is temporarily unavailable. Please try again.' };
  }

  const allowedHosts = String(process.env.TURNSTILE_HOSTNAMES || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (result.success && allowedHosts.length > 0
      && !allowedHosts.includes(String(result.hostname || '').toLowerCase())) {
    result = { ...result, success: false };
  }

  if (!result.success) {
    return { status: 401, code: 'TURNSTILE_FAILED', message: 'Security check failed. Please try again.' };
  }
  return null;
}
async function handle(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, null);
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  const method = req.method;
  try {
    if (path === '/api/health') return json(res, 200, { ok: true });
    // Public, so the client can discover which widget this API verifies against
    // without the site key being hard-coded into the bundle.
    if (path === '/api/config' && method === 'GET') {
      return json(res, 200, { environment: process.env.NODE_ENV || 'development', turnstile: turnstileConfig() });
    }
    if (path === '/api/auth/register' && method === 'POST') {
      const input = await body(req);
      const captcha = await verifyTurnstile(req, input);
      if (captcha) return error(res, captcha.status, captcha.code, captcha.message);
      const email = String(input.email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email) || String(input.password || '').length < 8) return error(res, 400, 'INVALID_INPUT', 'Use a valid email and a password of at least 8 characters');
      if (db.users.some(u => u.email === email)) return error(res, 409, 'EMAIL_TAKEN', 'Email is already registered');
      const user = newUser(email, input.password, String(input.name || email.split('@')[0]).slice(0, 40));
      const inviter = db.users.find(u => u.inviteCode === String(input.inviteCode || '').toUpperCase());
      if (inviter) { user.invitedBy = inviter.id; inviter.referrals.push(user.id); addReward(inviter, 'coins', 200, 'Referral'); }
      db.users.push(user); const token = await createSession(user);
      return json(res, 201, { token, user: publicUser(user) });
    }
    if (path === '/api/auth/login' && method === 'POST') {
      const input = await body(req);
      // Verified before the password lookup so a rejected bot costs one HTTP call.
      const captcha = await verifyTurnstile(req, input);
      if (captcha) return error(res, captcha.status, captcha.code, captcha.message);
      const user = db.users.find(u => u.email === String(input.email || '').toLowerCase());
      if (!user || !verify(String(input.password || ''), user.passwordHash)) return error(res, 401, 'BAD_LOGIN', 'Invalid email or password');
      if (user.twoStepSecret && !validOtp(user.twoStepSecret, input.code)) return error(res, 401, 'TWO_STEP_REQUIRED', 'Enter the six-digit code from your authenticator');
      const token = await createSession(user);
      return json(res, 200, { token, user: publicUser(user) });
    }
    const token = String(req.headers.authorization || '').replace(/^Bearer /i, '');
    const session = db.sessions[token];
    const user = session?.expiresAt > Date.now() ? db.users.find(u => u.id === session.userId) : null;
    if (!user) return error(res, 401, 'AUTH_REQUIRED', 'Please sign in');
    if (path === '/api/auth/logout' && method === 'POST') { delete db.sessions[token]; await save(); return json(res, 200, { ok: true }); }
    if (path === '/api/auth/me') return json(res, 200, publicUser(user));
    if (path === '/api/profile' && method === 'GET') return json(res, 200, { ...publicUser(user), stats: { gamesPlayed: user.games.length, rewardsEarned: user.rewards.length, wins: user.games.filter(g => g.won).length }, recentGames: user.games.slice(0, 5) });
    if (path === '/api/profile' && method === 'PATCH') {
      const input = await body(req); if (typeof input.name === 'string') user.name = input.name.trim().slice(0, 40) || user.name;
      await save(); return json(res, 200, publicUser(user));
    }
    if (path === '/api/settings' && method === 'GET') return json(res, 200, user.settings);
    if (path === '/api/settings' && method === 'PATCH') {
      const input = await body(req); const allowed = ['online', 'stealth', 'graphics', 'fps', 'privateProfile', 'twoStep', 'rewardAlerts'];
      for (const key of allowed.filter(k => k !== 'twoStep')) if (key in input) user.settings[key] = input[key];
      if (!['auto', 'low', 'medium', 'high'].includes(user.settings.graphics)) user.settings.graphics = 'auto';
      if (![30, 60, 90, 120].includes(Number(user.settings.fps))) user.settings.fps = 60;
      await save(); return json(res, 200, user.settings);
    }
    if (path === '/api/settings/two-step/setup' && method === 'POST') {
      if (user.twoStepSecret) return error(res, 409, 'ALREADY_ENABLED', 'Two-step authentication is already enabled');
      user.pendingTwoStepSecret = base32(randomBytes(20)); await save();
      return json(res, 200, { secret: user.pendingTwoStepSecret, uri: `otpauth://totp/Playloot:${encodeURIComponent(user.email)}?secret=${user.pendingTwoStepSecret}&issuer=Playloot` });
    }
    if (path === '/api/settings/two-step/enable' && method === 'POST') {
      const input = await body(req);
      if (!user.pendingTwoStepSecret || !validOtp(user.pendingTwoStepSecret, input.code)) return error(res, 400, 'INVALID_CODE', 'Authenticator code is incorrect');
      user.twoStepSecret = user.pendingTwoStepSecret; delete user.pendingTwoStepSecret; user.settings.twoStep = true; await save();
      return json(res, 200, { enabled: true });
    }
    if (path === '/api/settings/two-step/disable' && method === 'POST') {
      const input = await body(req);
      if (!user.twoStepSecret || !validOtp(user.twoStepSecret, input.code)) return error(res, 400, 'INVALID_CODE', 'Authenticator code is incorrect');
      delete user.twoStepSecret; user.settings.twoStep = false; await save(); return json(res, 200, { enabled: false });
    }
    if (path === '/api/wallet') return json(res, 200, { coins: user.coins, diamonds: user.diamonds, cash: user.cash, rewards: user.rewards.slice(0, 20) });
    if (path === '/api/rewards') return json(res, 200, { rewards: user.rewards.slice(0, 100), claims: user.claims.slice(0, 50) });
    if (path === '/api/notifications') return json(res, 200, { items: user.rewards.slice(0, 15).map(r => ({ id: r.id, text: `${r.source}: +${r.amount} ${r.kind}`, at: r.at })) });
    if (path === '/api/daily' && method === 'GET') return json(res, 200, { claimed: user.daily.checkIn === today(), nextAvailableAt: new Date(Date.now() + DAY).toISOString() });
    if (path === '/api/daily/claim' && method === 'POST') {
      if (user.daily.checkIn === today()) return error(res, 409, 'ALREADY_CLAIMED', 'Daily bonus already claimed');
      user.daily.checkIn = today(); const reward = addReward(user, 'coins', 50, 'Daily check-in'); await save(); return json(res, 200, { reward, wallet: { coins: user.coins, diamonds: user.diamonds } });
    }
    if (path === '/api/missions' && method === 'GET') return json(res, 200, { missions: missionState(user) });
    if (path === '/api/missions/claim' && method === 'POST') {
      const input = await body(req); const mission = missionState(user).find(m => m.id === input.id);
      if (!mission) return error(res, 404, 'NOT_FOUND', 'Mission not found');
      if (mission.claimed || mission.progress < mission.target) return error(res, 409, 'NOT_READY', 'Mission is not ready to claim');
      user.daily.missionClaims ||= {}; user.daily.missionClaims[mission.id] = today();
      const reward = addReward(user, 'coins', mission.reward, mission.title); await save(); return json(res, 200, { reward, missions: missionState(user) });
    }
    if (path === '/api/invite') return json(res, 200, { code: user.inviteCode, referrals: user.referrals.length, rewardPerInvite: 200 });
    if (path === '/api/leaderboard') {
      const ranked = db.users.filter(u => !u.settings.privateProfile && !u.settings.stealth).sort((a, b) => b.coins - a.coins);
      const players = ranked.map((u, i) => ({ rank: i + 1, name: u.name, coins: u.coins, diamonds: u.diamonds, level: u.level, tier: u.tier, gamerId: u.gamerId }));
      return json(res, 200, { players: players.slice(0, 100), totalPlayers: players.length, me: { ...publicUser(user), rank: ranked.findIndex(u => u.id === user.id) + 1, coins: user.coins } });
    }
    if (path === '/api/redeem/options') return json(res, 200, { options });
    if (path === '/api/redeem' && method === 'POST') {
      const input = await body(req); const option = options.find(o => o.id === input.optionId);
      if (!option) return error(res, 404, 'NOT_FOUND', 'Reward option not found');
      const used = user.claims.filter(c => c.at.startsWith(today())).length;
      if (used >= 5) return error(res, 429, 'DAILY_LIMIT', 'Daily redemption limit reached');
      if (user.coins < option.coinsRequired) return error(res, 409, 'INSUFFICIENT_COINS', 'Not enough coins');
      user.coins -= option.coinsRequired;
      const claim = { id: randomUUID(), option, status: 'pending', at: new Date().toISOString() };
      user.claims.unshift(claim); await save(); return json(res, 201, { claim, coins: user.coins });
    }
    if (path === '/api/games/play/start' && method === 'POST') {
      const input = await body(req); if (!input.gameCode) return error(res, 400, 'INVALID_INPUT', 'Game code is required');
      const sessionId = randomUUID(); user.playSessions[sessionId] = { gameCode: String(input.gameCode), title: String(input.title || 'Game'), startedAt: Date.now(), claimed: false };
      await save(); return json(res, 201, { sessionId });
    }
    if (path === '/api/games/play/claim' && method === 'POST') {
      const input = await body(req); const session = user.playSessions[input.sessionId];
      if (!session || session.claimed) return error(res, 409, 'INVALID_SESSION', 'Play session unavailable');
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      if (elapsed < 120) return error(res, 409, 'TOO_EARLY', 'Play for at least two minutes to claim');
      const rewardedSeconds = Math.min(elapsed, 7200);
      session.claimed = true; const coinsAwarded = Math.floor((rewardedSeconds - 120) / 60) * 10;
      if (coinsAwarded > 0) addReward(user, 'coins', coinsAwarded, `Played ${session.title}`);
      user.games.unshift({ gameCode: session.gameCode, title: session.title, seconds: rewardedSeconds, at: new Date().toISOString() });
      user.level = Math.floor(user.games.length / 5) + 1; await save(); return json(res, 200, { coinsAwarded, coins: user.coins });
    }
    if (path === '/api/spin' && method === 'GET') return json(res, 200, { alreadySpunToday: user.daily.spin === today() });
    if (path === '/api/spin' && method === 'POST') {
      if (user.daily.spin === today()) return error(res, 409, 'ALREADY_SPUN', 'Daily spin already used');
      const prize = prizes[randomBytes(1)[0] % prizes.length]; user.daily.spin = today();
      addReward(user, prize.kind, prize.amount, 'Lucky spin'); await save(); return json(res, 200, { prize, wallet: { coins: user.coins, diamonds: user.diamonds } });
    }
    if (path === '/api/avatar' && method === 'POST') return error(res, 501, 'NOT_CONFIGURED', 'Avatar storage is not configured');
    return error(res, 404, 'NOT_FOUND', 'Endpoint not found');
  } catch (err) { console.error(err); return error(res, 500, 'SERVER_ERROR', 'Something went wrong'); }
}

await init();
export { handle };
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  http.createServer(handle).listen(PORT, () => console.log(`Playloot API on http://localhost:${PORT}`));
}
