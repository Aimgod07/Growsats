import { test } from 'node:test';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('reward endpoints enforce daily limits and balances', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'playloot-smoke-'));
  process.env.PLAYLOOT_DATA_FILE = join(dir, 'data.json');
  try {
    const { handle } = await import('./index.js');
    async function call(path, method = 'GET', input, token) {
      const req = Readable.from(input === undefined ? [] : [Buffer.from(JSON.stringify(input))]);
      req.url = path; req.method = method;
      req.headers = { host: 'localhost', 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
      let status, result;
      const res = { writeHead(code) { status = code; }, end(payload) { result = JSON.parse(payload || 'null'); } };
      await handle(req, res);
      return { status, result };
    }
    const login = await call('/api/auth/login', 'POST', { email: 'demo@playloot.gg', password: 'Playloot@123' });
    assert.equal(login.status, 200);
    const token = login.result.token;
    const daily = await call('/api/daily/claim', 'POST', {}, token);
    assert.equal(daily.result.reward.amount, 50);
    assert.equal((await call('/api/daily/claim', 'POST', {}, token)).status, 409);
    assert.equal((await call('/api/redeem', 'POST', { optionId: 'gp-1' }, token)).result.error.code, 'INSUFFICIENT_COINS');
    assert.equal((await call('/api/spin', 'POST', {}, token)).status, 200);
    assert.equal((await call('/api/spin', 'POST', {}, token)).status, 409);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
