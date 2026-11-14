import { fail, sha256, constantTimeEqual, randomToken, addDays } from "./util.js";

const SESSION_COOKIE = "pl_session";

export function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowAll = allowed.includes("*");
  const allowOrigin = allowAll ? "*" : allowed.includes(origin) ? origin : "null";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-credentials": allowAll ? "false" : "true",
    "access-control-allow-headers": "content-type, authorization, x-admin-key",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    vary: "Origin",
  };
}

function readToken(request, env) {
  const header = request.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  if (env.SUPPORT_COOKIES !== "off") {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    if (match) return decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  }
  return null;
}

export async function authenticate(request, env) {
  const token = readToken(request, env);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT s.token_hash, s.expires_at, u.id, u.email, u.name, u.handle, u.country_code,
            u.tier, u.level, u.avatar_key, u.email_verified, u.created_at, w.coins, w.diamonds, w.cash_cents
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN wallets w ON w.user_id = u.id
      WHERE s.token_hash = ?1 AND u.banned=0`,
  )
    .bind(tokenHash)
    .first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
    return null;
  }
  if (!constantTimeEqual(row.token_hash, tokenHash)) return null;

  return {
    token,
    tokenHash,
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      handle: row.handle,
      countryCode: row.country_code,
      tier: row.tier,
      level: row.level,
      avatarKey: row.avatar_key,
      emailVerified: !!row.email_verified,
      createdAt: row.created_at,
    },
    wallet: {
      coins: row.coins ?? 0,
      diamonds: row.diamonds ?? 0,
      cashCents: row.cash_cents ?? 0,
    },
  };
}

export function sessionCookie(token, maxAgeSeconds) {
  return `pl_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie() {
  return "pl_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}

export async function createSession(env, userId, userAgent) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const days = Number(env.SESSION_DAYS || 30);
  const expiresAt = addDays(days);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, user_agent, expires_at) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(tokenHash, userId, userAgent || null, expiresAt)
    .run();
  return { token, expiresAt, maxAge: days * 86400 };
}

export async function destroySession(env, tokenHash) {
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
}

export { fail };
