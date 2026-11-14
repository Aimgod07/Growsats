import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
import { pbkdf2 } from './lib/util.js';
import { setupTwoStepRoute } from './routes/hub.js';

test('sign-in requires a valid authenticator code when two-step is enabled', async () => {
  const salt = 'test-salt';
  const user = {
    id: 'user-1', email: 'player@example.test', passwordHash: await pbkdf2('Password123', salt),
    salt, name: 'Player', handle: 'player', tier: 'BRONZE', level: 1,
    emailVerified: 0, banned: 0,
  };
  let sessionsCreated = 0;
  const statement = (sql) => {
    const api = {
      bind() { return api; },
      async first() {
        if (sql.includes('JOIN user_authentication a')) return user;
        if (sql.includes('FROM user_settings')) return { secret: 'JBSWY3DPEHPK3PXP', enabled: 1 };
        return null;
      },
      async run() {
        if (sql.includes('INSERT INTO sessions')) sessionsCreated += 1;
        return { meta: { changes: 1 } };
      },
    };
    return api;
  };
  const env = {
    ALLOWED_ORIGINS: 'http://localhost:5173',
    DB: {
      prepare: statement,
      async batch(statements) {
        return Promise.all(statements.map((entry) => entry.run()));
      },
    },
  };

  for (const code of [undefined, '12345', 'invalid']) {
    const response = await worker.fetch(new Request('http://localhost:8787/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'Password123', code }),
    }), env);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'two_step_required');
  }
  assert.equal(sessionsCreated, 0);
});

test('setup cannot disable an already enabled authenticator', async () => {
  let writes = 0;
  const env = { DB: { prepare() { return {
    bind() { return this; },
    async first() { return { enabled: 1, secret: 'JBSWY3DPEHPK3PXP' }; },
    async run() { writes += 1; },
  }; } } };
  const response = await setupTwoStepRoute({ user: { id: 'user-1' } }, env);
  assert.equal(response.status, 409);
  assert.equal(writes, 0);
});
