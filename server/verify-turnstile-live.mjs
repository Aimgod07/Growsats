// Live check of server/index.js Turnstile enforcement against Cloudflare's real
// siteverify endpoint. Uses Cloudflare's published test secret (accepts any
// token) plus the production secret (must reject forged tokens).
//
//   node server/verify-turnstile-live.mjs
import process from 'node:process';
import { verifyTurnstile, turnstileConfig } from './index.js';

const TEST_SECRET = '1x0000000000000000000000000000000AA';
const PROD_SECRET = '0x4AAAAAAFXmAaV2IyXSTrVTC9PnJI9OwyM';

const req = { headers: { 'cf-connecting-ip': '203.0.113.9' }, socket: {} };

async function check(label, env, token, expected) {
  Object.assign(process.env, env);
  const result = await verifyTurnstile(req, { turnstileToken: token });
  const got = result ? `${result.status} ${result.code}` : 'PASS';
  const ok = got === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} -> ${got}`);
  return ok;
}

let all = true;
all &= await check('test secret + any token', { TURNSTILE_SECRET_KEY: TEST_SECRET }, 'dummy-token-abcdefgh', 'PASS');
all &= await check('prod secret + forged token', { TURNSTILE_SECRET_KEY: PROD_SECRET }, 'dummy-token-abcdefgh', '401 TURNSTILE_FAILED');
all &= await check('prod secret + test token', { TURNSTILE_SECRET_KEY: PROD_SECRET }, 'XXXX.DUMMY.TOKEN.XXXX', '401 TURNSTILE_FAILED');
all &= await check('no token', { TURNSTILE_SECRET_KEY: TEST_SECRET }, undefined, '400 TURNSTILE_REQUIRED');
all &= await check('short token', { TURNSTILE_SECRET_KEY: TEST_SECRET }, 'abc', '400 TURNSTILE_REQUIRED');
all &= await check(
  'allowlist mismatch',
  { TURNSTILE_SECRET_KEY: TEST_SECRET, TURNSTILE_HOSTNAMES: 'playloot.pages.dev' },
  'dummy-token-abcdefgh',
  '401 TURNSTILE_FAILED',
);
all &= await check('TURNSTILE_ENFORCE=off bypasses', { TURNSTILE_SECRET_KEY: PROD_SECRET, TURNSTILE_ENFORCE: 'off' }, undefined, 'PASS');
all &= await check('no secret means not required', { TURNSTILE_SECRET_KEY: '' }, 'anything', 'PASS');

console.log(`\nconfig with no env: ${JSON.stringify(turnstileConfig())}`);
console.log(all ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
process.exitCode = all ? 0 : 1;