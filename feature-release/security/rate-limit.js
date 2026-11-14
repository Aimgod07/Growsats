import { fail } from "./util.js";

const encoder = new TextEncoder();

const LOGIN_ACCOUNT_LIMIT = 8; // per IP + email
const LOGIN_IP_LIMIT = 30; // per IP, across all emails
const SIGNUP_IP_LIMIT = 5; // per IP per hour

export function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}

function limiterKeys(request, email) {
  const ip = clientIp(request);
  return {
    ip,
    account: email ? `login:${ip}:${email}` : null,
    ipOnly: `login-ip:${ip}`,
  };
}

/**
 * Fixed-window counter kept in D1.
 *
 * Counts *failures* rather than requests, so a legitimate player signing in
 * repeatedly is never locked out while password spraying is still throttled.
 * Register is the exception: it counts every attempt, because the goal there
 * is to cap how many accounts one address can mint.
 */
export async function recordAuthFailure(env, request, email) {
  const keys = limiterKeys(request, email);
  const now = Date.now();
  const windowStart = now - 15 * 60 * 1000;

  const statements = [keys.ipOnly, keys.account].filter(Boolean).map((key) =>
    env.DB.prepare(
      `INSERT INTO auth_attempts (key, attempts, window_start) VALUES (?1, 1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           attempts   = CASE WHEN window_start < ?3 THEN 1 ELSE attempts + 1 END,
           window_start = CASE WHEN window_start < ?3 THEN ?2 ELSE window_start END`,
    ).bind(key, now, windowStart),
  );

  await env.DB.batch(statements);
}

export async function clearAuthFailures(env, request, email) {
  const keys = limiterKeys(request, email);
  const ids = [keys.account].filter(Boolean);
  if (ids.length) {
    await env.DB.prepare(
      `DELETE FROM auth_attempts WHERE key IN (${ids.map((_, i) => `?${i + 1}`).join(", ")})`,
    )
      .bind(...ids)
      .run();
  }
}

async function blocked(env, key, limit, windowMs) {
  const row = await env.DB.prepare("SELECT attempts, window_start FROM auth_attempts WHERE key = ?1")
    .bind(key)
    .first();
  return Boolean(row && row.window_start > Date.now() - windowMs && row.attempts >= limit);
}

/** Returns a 429 Response when the IP/email pair is being sprayed. */
export async function checkLoginLimit(env, request, email) {
  const keys = limiterKeys(request, email);
  if (keys.account && (await blocked(env, keys.account, LOGIN_ACCOUNT_LIMIT, 15 * 60 * 1000))) {
    return fail("Too many sign-in attempts. Try again later", 429, "too_many_attempts");
  }
  if (await blocked(env, keys.ipOnly, LOGIN_IP_LIMIT, 15 * 60 * 1000)) {
    return fail("Too many sign-in attempts. Try again later", 429, "too_many_attempts");
  }
  return null;
}

export async function checkSignupLimit(env, request) {
  const key = `signup:${clientIp(request)}`;
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;

  const row = await env.DB.prepare("SELECT attempts, window_start FROM auth_attempts WHERE key = ?1")
    .bind(key)
    .first();
  if (row && row.window_start > windowStart && row.attempts >= SIGNUP_IP_LIMIT) {
    return fail("Too many new accounts from this device. Try again later", 429, "signup_limit");
  }

  await env.DB.prepare(
    `INSERT INTO auth_attempts (key, attempts, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         attempts     = CASE WHEN window_start < ?3 THEN 1 ELSE attempts + 1 END,
         window_start = CASE WHEN window_start < ?3 THEN ?2 ELSE window_start END`,
  )
    .bind(key, now, windowStart)
    .run();

  return null;
}

/** Drops rows from long-finished windows. Cheap enough to run opportunistically. */
export async function pruneAttempts(env) {
  try {
    await env.DB.prepare("DELETE FROM auth_attempts WHERE window_start < ?1")
      .bind(Date.now() - 24 * 60 * 60 * 1000)
      .run();
  } catch {
    // Best effort; a stale row self-heals when its window lapses.
  }
}
