import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
import { iso } from './lib/util.js';
import { encryptSecret, decryptSecret } from './lib/crypto.js';
import { leaderboardRoute, redeemRoute, profileRoute } from './routes/account.js';
import { setupTwoStepRoute, enableTwoStepRoute } from './routes/hub.js';
import { startPlayRoute, claimPlayRoute } from './routes/rewards.js';

function stubDB(handler) {
  return {
    prepare(sql) {
      const api = {
        bind() { return api; },
        sql,
        async first() { return handler.first ? handler.first(sql) : null; },
        async all() { return handler.all ? handler.all(sql) : { results: [] }; },
        async run() { return handler.run ? handler.run(sql) : { meta: { changes: 1 } }; },
      };
      return api;
    },
    async batch(statements) { return Promise.all(statements.map((entry) => entry.run())); },
  };
}

const session = { user: { id: 'user-1', handle: 'player', name: 'Player' }, wallet: { coins: 1000, diamonds: 5, cashCents: 500 } };

// ---------------------------------------------------------------------------
// Timestamps
// ---------------------------------------------------------------------------

test('SQLite datetime output becomes real UTC ISO, not a local-time string', () => {
  // Untagged "2026-03-01 00:30:00" would parse as local and shift the date.
  assert.equal(iso('2026-03-01 00:30:00'), '2026-03-01T00:30:00.000Z');
  assert.equal(iso('2026-03-01T00:30:00.000Z'), '2026-03-01T00:30:00.000Z');
  assert.equal(iso(null), null);
  assert.equal(iso(''), null);
  assert.equal(iso(1772000000), new Date(1772000000 * 1000).toISOString());
  assert.equal(iso('not a date'), null);
});

// ---------------------------------------------------------------------------
// Leaderboard privacy
// ---------------------------------------------------------------------------

test('leaderboard excludes players who chose a private profile or stealth', async () => {
  const seen = [];
  const env = {
    DB: stubDB({
      all: (sql) => {
        seen.push(sql);
        return { results: [] };
      },
      first: () => ({ count: 0 }),
    }),
  };

  await leaderboardRoute(session, env);

  const board = seen.find((sql) => sql.includes('LIMIT 25'));
  assert.match(board, /private_profile/, 'leaderboard must filter private profiles');
  assert.match(board, /stealth/, 'leaderboard must filter stealth players');
  assert.match(board, /LEFT JOIN user_settings s/, 'leaderboard privacy filters require the settings join');
});

test('leaderboard reports a real rank for a player below the visible cut-off', async () => {
  const env = {
    DB: stubDB({
      all: () => ({ results: [] }),
      first: (sql) => (sql.includes('AS rank')
        ? { id: 'user-1', name: 'Player', handle: 'player', tier: 'BRONZE', level: 3, coins: 10, diamonds: 0, rank: 214 }
        : { count: 900 }),
    }),
  };

  const board = await leaderboardRoute(session, env);
  assert.equal(board.players.length, 0);
  assert.equal(board.me.rank, 214, 'me must not be null just because of the cut-off');
  assert.equal(board.me.gamerId, 'player');
  assert.equal(board.totalPlayers, 900);
});

// ---------------------------------------------------------------------------
// Redeem atomicity
// ---------------------------------------------------------------------------

test('redeem writes no claim and charges no coins when the balance insert is rejected', async () => {
  const statements = [];
  const env = {
    DB: stubDB({
      first: (sql) => (sql.includes('FROM redemptions') ? { count: 0 } : { coins: 100 }),
      run: (sql) => {
        statements.push(sql);
        // Simulate the conditional INSERT matching zero rows.
        return { meta: { changes: sql.includes('INSERT INTO redemptions') ? 0 : 1 } };
      },
    }),
  };

  const result = await redeemRoute(session, env, { optionId: 'gp-1' });

  assert.equal(result.status, 409);
  assert.equal((await result.json()).error.code, 'insufficient_coins');
  assert.ok(
    !statements.some((sql) => sql.includes('UPDATE wallets SET coins = coins -')),
    'must not debit when the claim row was never written',
  );
});

// ---------------------------------------------------------------------------
// TOTP encryption at rest
// ---------------------------------------------------------------------------

const KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

test('two-step secrets round-trip through encryption', async () => {
  const env = { TWO_STEP_ENCRYPTION_KEY: KEY };
  const stored = await encryptSecret(env, 'JBSWY3DPEHPK3PXP');

  assert.notEqual(stored, 'JBSWY3DPEHPK3PXP');
  assert.match(stored, /^v1\./);
  assert.equal(await decryptSecret(env, stored), 'JBSWY3DPEHPK3PXP');
});

test('the same secret encrypts to different ciphertext each time', async () => {
  const env = { TWO_STEP_ENCRYPTION_KEY: KEY };
  const a = await encryptSecret(env, 'JBSWY3DPEHPK3PXP');
  const b = await encryptSecret(env, 'JBSWY3DPEHPK3PXP');
  assert.notEqual(a, b, 'a per-value IV must make ciphertext unique');
});

test('legacy plaintext secrets still verify', async () => {
  assert.equal(await decryptSecret({ TWO_STEP_ENCRYPTION_KEY: KEY }, 'LEGACYPLAIN'), 'LEGACYPLAIN');
});

test('setup returns an otpauth uri so authenticator apps and QR codes work', async () => {
  const env = {
    TWO_STEP_ENCRYPTION_KEY: KEY,
    DB: stubDB({ first: () => ({ secret: null, enabled: 0 }) }),
  };

  const result = await setupTwoStepRoute({ user: { id: 'user-1', email: 'a@b.test' } }, env);
  assert.match(result.uri, /^otpauth:\/\/totp\/Playloot:/);
  assert.ok(result.uri.includes(`secret=${result.secret}`));
});

test('enable rejects a wrong code and accepts the right one', async () => {
  const plaintext = 'JBSWY3DPEHPK3PXP';
  const env = {
    TWO_STEP_ENCRYPTION_KEY: KEY,
    DB: stubDB({ first: () => ({ secret: encrypted, enabled: 0 }) }),
  };
  const encrypted = await encryptSecret(env, plaintext);
  // JBSWY3DPEHPK3PXP is the well-known base32 encoding of "Hello!\xDE\xAD\xBE\xEF".
  const good = await currentTotp(plaintext);

  const rejected = await enableTwoStepRoute({ user: { id: 'user-1' } }, env, { code: '000000' });
  assert.equal(rejected.status, 400);

  const accepted = await enableTwoStepRoute({ user: { id: 'user-1' } }, env, { code: good });
  assert.deepEqual(accepted, { enabled: true, twoStep: true });
});

async function currentTotp(secret) {
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) bits += base32.indexOf(char).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Math.floor(Date.now() / 30000);

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey('raw', new Uint8Array(bytes), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
  const offset = hash[hash.length - 1] & 0x0f;
  const code = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
  return String(code % 1000000).padStart(6, '0');
}

// ---------------------------------------------------------------------------
// Play-session and earning limits
// ---------------------------------------------------------------------------

test('play sessions are capped so the start route cannot be spammed', async () => {
  const env = { DB: stubDB({ first: () => ({ count: 3 }) }) };
  const result = await startPlayRoute(session, env, { gameCode: 'neon-runner' });
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error.code, 'too_many_sessions');
});

test('a session is refused with 409, not 404, when it does not exist', async () => {
  const env = { DB: stubDB({ first: () => null }) };
  const result = await claimPlayRoute(session, env, { sessionId: 'nope' });
  assert.equal(result.status, 409);
  assert.equal((await result.json()).error.code, 'invalid_session');
});

test('daily coin earnings are capped', async () => {
  const env = {
    DAILY_EARN_CAP: '100',
    DB: stubDB({
      first: (sql) => (sql.includes('coins_awarded') ? { total: 95 } : { id: 's1', claimed: 0, gameCode: 'g', title: 'G', elapsedSeconds: 1200 }),
    }),
  };
  const result = await claimPlayRoute(session, env, { sessionId: 's1' });
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error.code, 'daily_limit');
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

test('recent games require a claim or recorded play time', async () => {
  const seen = [];
  const env = { DB: stubDB({ first: () => ({}), all: (sql) => { seen.push(sql); return { results: [] }; } }) };
  await profileRoute({ user: { id: 'user-1', handle: 'p', name: 'P', email: 'e', countryCode: 'IN', tier: 'BRONZE', level: 1, emailVerified: false, avatarKey: null, createdAt: '2026-01-01 00:00:00' }, wallet: { coins: 0, diamonds: 0, cashCents: 0 } }, env, 'https://example.test');

  const recent = seen.find((sql) => sql.includes('FROM play_sessions WHERE user_id = ?1 AND (claimed = 1 OR seconds > 0 OR EXISTS'));
  assert.ok(recent, 'empty unclaimed sessions must be excluded from recent games');
});

// ---------------------------------------------------------------------------
// JSON body handling
// ---------------------------------------------------------------------------

test('a malformed JSON body is rejected instead of being read as empty input', async () => {
  const env = { DB: stubDB({}) };
  const response = await worker.fetch(new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  }), env);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'invalid_json');
});

test('a non-JSON content type is rejected with 415', async () => {
  const env = { DB: stubDB({}) };
  const response = await worker.fetch(new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'email=a@b.test',
  }), env);

  assert.equal(response.status, 415);
  assert.equal((await response.json()).error.code, 'unsupported_media_type');
});
