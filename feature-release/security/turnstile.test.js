import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
import { pbkdf2 } from './lib/util.js';

const SECRET = '0xtest-secret';

function jsonResponse(payload, ok = true) {
  return { ok, json: async () => payload };
}

async function loginRequest(body, env) {
  return worker.fetch(new Request('http://localhost:8787/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), env);
}

async function knownUser() {
  const salt = 'test-salt';
  return {
    id: 'user-1',
    email: 'player@example.test',
    passwordHash: await pbkdf2('Password123', salt),
    salt,
    name: 'Player',
    handle: 'player',
    tier: 'BRONZE',
    level: 1,
    emailVerified: 0,
    banned: 0,
  };
}

function stubEnv(user, overrides = {}) {
  let sessionsCreated = 0;
  const statement = (sql) => {
    const api = {
      bind() { return api; },
      async first() {
        if (sql.includes('JOIN user_authentication a')) return user;
        if (sql.includes('FROM user_settings')) return null;
        if (sql.includes('FROM wallets')) return { coins: 0, diamonds: 0, cash_cents: 0 };
        return null;
      },
      async run() {
        if (sql.includes('INSERT INTO sessions')) sessionsCreated += 1;
        return { meta: { changes: 1 } };
      },
    };
    return api;
  };

  return {
    env: {
      ALLOWED_ORIGINS: 'http://localhost:5173',
      TURNSTILE_SECRET_KEY: SECRET,
      TURNSTILE_SITE_KEY: '0xtest-site-key',
      DB: {
        prepare: statement,
        async batch(statements) {
          return Promise.all(statements.map((entry) => entry.run()));
        },
      },
      ...overrides,
    },
    sessionsCreated: () => sessionsCreated,
  };
}

test('GET /api/config advertises the public site key without a session', async () => {
  const { env } = stubEnv(null);
  const response = await worker.fetch(new Request('http://localhost:8787/api/config'), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.turnstile.siteKey, '0xtest-site-key');
  assert.equal(body.turnstile.required, true);
});

test('a missing captcha token is rejected before credentials are checked', async () => {
  const user = await knownUser();
  const { env, sessionsCreated } = stubEnv(user);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ success: true });

  try {
    for (const token of [undefined, '', 'short', 'x'.repeat(2049)]) {
      const response = await loginRequest({ email: user.email, password: 'Password123', turnstileToken: token }, env);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'turnstile_required');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(sessionsCreated(), 0);
});

test('a rejected token returns turnstile_failed and issues no session', async () => {
  const user = await knownUser();
  const { env, sessionsCreated } = stubEnv(user);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] });

  try {
    const response = await loginRequest(
      { email: user.email, password: 'Password123', turnstileToken: 'valid-looking-token' },
      env,
    );
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'turnstile_failed');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(sessionsCreated(), 0);
});

test('an unreachable verifier fails closed instead of allowing the sign-in', async () => {
  const user = await knownUser();
  const { env } = stubEnv(user);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network down'); };

  try {
    const response = await loginRequest(
      { email: user.email, password: 'Password123', turnstileToken: 'valid-looking-token' },
      env,
    );
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'turnstile_unavailable');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('tokens minted for an unlisted hostname are refused', async () => {
  const user = await knownUser();
  const { env } = stubEnv(user, { TURNSTILE_HOSTNAMES: 'playloot.pages.dev' });
  const originalFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (_url, init) => {
    seen = init.body.get('remoteip');
    return jsonResponse({ success: true, hostname: 'evil.example' });
  };

  try {
    const response = await worker.fetch(new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
      body: JSON.stringify({
        email: user.email, password: 'Password123', turnstileToken: 'valid-looking-token',
      }),
    }), env);

    assert.equal(seen, '203.0.113.9');
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'turnstile_failed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a verified token lets the sign-in through and forwards the caller IP', async () => {
  const user = await knownUser();
  const { env, sessionsCreated } = stubEnv(user);
  const originalFetch = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (_url, init) => {
    seen = init.body.get('remoteip');
    return jsonResponse({ success: true, hostname: 'playloot.pages.dev', action: 'login' });
  };

  try {
    const response = await worker.fetch(new Request('http://localhost:8787/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
      body: JSON.stringify({
        email: user.email, password: 'Password123', turnstileToken: 'valid-looking-token',
      }),
    }), env);

    assert.equal(seen, '203.0.113.9');
    assert.equal(response.status, 200);
    assert.ok((await response.json()).token);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(sessionsCreated(), 1);
});

test('TURNSTILE_ENFORCE=off skips verification so local development keeps working', async () => {
  const user = await knownUser();
  const { env } = stubEnv(user, { TURNSTILE_ENFORCE: 'off' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('siteverify must not be called'); };

  try {
    const response = await loginRequest({ email: user.email, password: 'Password123' }, env);
    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('registration is gated on the captcha too', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ success: true });

  const env = {
    ALLOWED_ORIGINS: '*',
    TURNSTILE_SECRET_KEY: SECRET,
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async first() { return null; },
          async run() { return { meta: { changes: 1 } }; },
        };
      },
    },
  };

  try {
    const rejected = await worker.fetch(new Request('http://localhost:8787/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Player', email: 'new@example.test', password: 'Password123' }),
    }), env);
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).error.code, 'turnstile_required');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
