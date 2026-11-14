import { test } from 'node:test';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SECRET = '0xtest-secret';

function request(path, method = 'GET', input, headers = {}) {
  const req = Readable.from(input === undefined ? [] : [Buffer.from(JSON.stringify(input))]);
  req.url = path;
  req.method = method;
  req.headers = { host: 'localhost', 'content-type': 'application/json', ...headers };
  req.socket = {};
  let status;
  let result;
  const res = {
    writeHead(code) { status = code; },
    end(payload) { result = payload === null || payload === undefined ? null : JSON.parse(payload); },
  };
  return { req, res, read: async () => { await handle(req, res); return { status, result }; } };
}

let handle;
async function withServer(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'playloot-turnstile-'));
  process.env.PLAYLOOT_DATA_FILE = join(dir, 'data.json');
  try {
    if (!handle) handle = (await import('./index.js')).handle;
    return await fn();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function stubFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = original; };
}

test('register and login reject a request with no captcha token', async () => {
  process.env.TURNSTILE_SECRET_KEY = SECRET;
  await withServer(async () => {
    for (const path of ['/api/auth/register', '/api/auth/login']) {
      const call = request(path, 'POST', { email: 'a@b.test', password: 'Password123' });
      const { status, result } = await call.read();
      assert.equal(status, 400);
      assert.equal(result.error.code, 'TURNSTILE_REQUIRED');
    }
  });
  delete process.env.TURNSTILE_SECRET_KEY;
});

test('a rejected token is refused with 401', async () => {
  process.env.TURNSTILE_SECRET_KEY = SECRET;
  const restore = stubFetch(async () => ({ ok: true, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }));
  try {
    await withServer(async () => {
      const call = request('/api/auth/login', 'POST', { email: 'a@b.test', password: 'Password123', turnstileToken: 'a-token-long-enough' });
      const { status, result } = await call.read();
      assert.equal(status, 401);
      assert.equal(result.error.code, 'TURNSTILE_FAILED');
    });
  } finally {
    restore();
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test('an unreachable siteverify fails closed instead of allowing sign-in', async () => {
  process.env.TURNSTILE_SECRET_KEY = SECRET;
  const restore = stubFetch(async () => { throw new Error('network down'); });
  try {
    await withServer(async () => {
      const call = request('/api/auth/login', 'POST', { email: 'a@b.test', password: 'Password123', turnstileToken: 'a-token-long-enough' });
      const { status, result } = await call.read();
      assert.equal(status, 503);
      assert.equal(result.error.code, 'TURNSTILE_UNAVAILABLE');
    });
  } finally {
    restore();
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test('a verified token lets a real sign-in through and forwards the caller IP', async () => {
  process.env.TURNSTILE_SECRET_KEY = SECRET;
  let seenRemoteIp;
  const restore = stubFetch(async (_url, init) => {
    seenRemoteIp = init.body.get('remoteip');
    return { ok: true, json: async () => ({ success: true, hostname: 'localhost' }) };
  });
  try {
    await withServer(async () => {
      const reg = request('/api/auth/register', 'POST', {
        name: 'Verified', email: 'ok@test.dev', password: 'Password123', turnstileToken: 'a-token-long-enough',
      }, { 'cf-connecting-ip': '203.0.113.9' });
      const created = await reg.read();
      assert.equal(created.status, 201);
      assert.equal(seenRemoteIp, '203.0.113.9');

      const login = request('/api/auth/login', 'POST', {
        email: 'ok@test.dev', password: 'Password123', turnstileToken: 'another-token-xx',
      });
      const signedIn = await login.read();
      assert.equal(signedIn.status, 200);
      assert.ok(signedIn.result.token);
    });
  } finally {
    restore();
    delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test('tokens minted for an unlisted hostname are refused', async () => {
  process.env.TURNSTILE_SECRET_KEY = SECRET;
  process.env.TURNSTILE_HOSTNAMES = 'playloot.pages.dev';
  const restore = stubFetch(async () => ({ ok: true, json: async () => ({ success: true, hostname: 'evil.example' }) }));
  try {
    await withServer(async () => {
      const call = request('/api/auth/login', 'POST', { email: 'a@b.test', password: 'Password123', turnstileToken: 'a-token-long-enough' });
      const { status, result } = await call.read();
      assert.equal(status, 401);
      assert.equal(result.error.code, 'TURNSTILE_FAILED');
    });
  } finally {
    restore();
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_HOSTNAMES;
  }
});

test('TURNSTILE_ENFORCE=off keeps local development usable without a secret', async () => {
  process.env.TURNSTILE_ENFORCE = 'off';
  const restore = stubFetch(async () => { throw new Error('siteverify must not be called'); });
  try {
    await withServer(async () => {
      const call = request('/api/auth/login', 'POST', { email: 'demo@playloot.gg', password: 'Playloot@123' });
      const { status } = await call.read();
      assert.equal(status, 200);
    });
  } finally {
    restore();
    delete process.env.TURNSTILE_ENFORCE;
  }
});

test('GET /api/config advertises the widget without a session', async () => {
  process.env.TURNSTILE_SECRET_KEY = SECRET;
  process.env.TURNSTILE_SITE_KEY = '0xtest-site-key';
  try {
    await withServer(async () => {
      const call = request('/api/config', 'GET');
      const { status, result } = await call.read();
      assert.equal(status, 200);
      assert.equal(result.turnstile.siteKey, '0xtest-site-key');
      assert.equal(result.turnstile.required, true);
    });
  } finally {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SITE_KEY;
  }
});