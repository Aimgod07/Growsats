import {operationsAdmin,deviceRoute,recordLogin} from './routes/operations.js';
import {remindersAdmin,remindersPlayer,sendReminders} from './routes/reminders.js';
import { offersAdmin, offersPlayer } from './routes/offers.js';
import { eventAdmin, eventPublic } from './routes/events.js';
import {
  json,
  fail,
  readJsonStrict,
  pbkdf2,
  constantTimeEqual,
  randomId,
  randomToken,
  iso,
} from "./lib/util.js";
import {
  corsHeaders,
  authenticate,
  createSession,
  destroySession,
  sessionCookie,
  clearCookie,
} from "./lib/auth.js";
import { turnstileConfig, verifyTurnstile } from "./lib/turnstile.js";
import { decryptSecret } from "./lib/crypto.js";
import {
  checkLoginLimit,
  checkSignupLimit,
  clearAuthFailures,
  recordAuthFailure,
  pruneAttempts,
} from "./lib/rate-limit.js";
import {
  profileRoute,
  walletRoute,
  leaderboardRoute,
  playerSearchRoute,
  publicPlayerProfileRoute,
  redeemOptionsRoute,
  redeemRoute,
} from "./routes/account.js";
import { startPlayRoute, claimPlayRoute, spinStatusRoute, spinRoute } from "./routes/rewards.js";
import {
  missionsRoute,
  claimMissionRoute,
  rewardsRoute,
  inviteRoute,
  dailyRoute,
  claimDailyRoute,
  notificationsRoute,
  settingsRoute,
  saveSettingsRoute,
  setupTwoStepRoute,
  enableTwoStepRoute,
  disableTwoStepRoute,
  verifyTotp,
  resolveInviter,
} from "./routes/hub.js";
import {
  isPmsAdmin,
  publicConfigRoute,
  pmsConfigRoute,
  savePmsConfigRoute,
  listProvidersRoute,
  saveProviderRoute,
  deleteProviderRoute,
  gamesCatalogRoute,
  uploadPmsIconRoute,
  pmsAssetRoute,
} from "./routes/pms.js";

const AVATAR_PREFIX = "avatars/";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

function publicOrigin(request, env) {
  return (env.WORKER_ORIGIN || new URL(request.url).origin).replace(/\/$/, "");
}

function handleFromName(name) {
  const base = String(name || "player")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base || "player";
}

async function uniqueHandle(env, name, email) {
  const seed = handleFromName(name);
  const emailPart = String(email || "").split("@")[0];
  const base = seed !== "player" ? seed : handleFromName(emailPart);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(Math.random() * 9000) + 100}`;
    const existing = await env.DB.prepare("SELECT 1 AS hit FROM users WHERE handle = ?1")
      .bind(candidate)
      .first();
    if (!existing) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

function newInviteCode() {
  return randomToken().toUpperCase().slice(0, 8);
}

async function registerRoute(request, env) {
  const { data: payload, error: parseError } = await readJsonStrict(request);
  if (parseError) return parseError;

  const name = String(payload?.name || "").trim().replace(/\s+/g, " ");
  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");

  const captcha = await verifyTurnstile(request, env, payload?.turnstileToken, "register");
  if (captcha) return captcha;

  const signupLimit = await checkSignupLimit(env, request);
  if (signupLimit) return signupLimit;

  if (name.length < 2) return fail("Enter your name", 400, "bad_request");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email", 400, "bad_request");
  if (password.length < 10) return fail("Password must be at least 10 characters", 400, "bad_request");

  const existing = await env.DB.prepare("SELECT 1 AS hit FROM users WHERE email = ?1")
    .bind(email)
    .first();
  if (existing) return fail("An account with this email already exists", 409, "email_taken");

  const userId = randomId("usr");
  const salt = randomToken();
  const passwordHash = await pbkdf2(password, salt);
  const handle = await uniqueHandle(env, name, email);

  // A supplied invite code must resolve. Silently dropping it would tell the
  // player their referral registered when no bonus will ever be paid.
  const suppliedCode = String(payload?.inviteCode || "").trim().toUpperCase();
  let inviterId = null;
  if (suppliedCode) {
    inviterId = await resolveInviter(env, suppliedCode, userId);
    if (!inviterId) return fail("That invite code doesn't exist", 400, "invalid_invite");
  }

  // Mint the player's own invite code up front so /api/invite never has to
  // lazily create one and referral attribution is stable from signup.
  const inviteCode = newInviteCode();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, salt, name, handle, country_code, tier, level, email_verified, banned, referred_by, invite_code, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'IN', 'BRONZE', 1, 0, 0, ?7, ?8, ?9)`,
    ).bind(userId, email, passwordHash, salt, name, handle, inviterId, inviteCode, iso(new Date())),
    env.DB.prepare(
      "INSERT INTO wallets (user_id, coins, diamonds, cash_cents, lifetime_coins) VALUES (?1, 0, 0, 0, 0)",
    ).bind(userId),
  ]);

  await recordLogin(env,request,userId,true);
  const session = await createSession(env, userId, request.headers.get("user-agent"));
  pruneAttempts(env);

  return json(
    {
      token: session.token,
      expiresAt: iso(session.expiresAt),
      user: {
        id: userId,
        email,
        name,
        handle,
        gamerId: handle,
        inviteCode,
        tier: "BRONZE",
        level: 1,
        emailVerified: false,
      },
      wallet: { coins: 0, diamonds: 0, cashCents: 0 },
    },
    201,
    { "set-cookie": sessionCookie(session.token, session.maxAge) },
  );
}

async function loginRoute(request, env) {
  const { data: payload, error: parseError } = await readJsonStrict(request);
  if (parseError) return parseError;

  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");

  const captcha = await verifyTurnstile(request, env, payload?.turnstileToken, "login");
  if (captcha) return captcha;

  if (!email || !password) return fail("Email and password are required", 400, "bad_request");

  const throttled = await checkLoginLimit(env, request, email);
  if (throttled) return throttled;

  const user = await env.DB.prepare(
    `SELECT u.id, a.email, a.password_hash AS passwordHash, a.salt, name, handle, country_code AS countryCode,
            tier, level, avatar_key AS avatarKey, email_verified AS emailVerified, banned, u.created_at AS createdAt
       FROM users u JOIN user_authentication a ON a.user_id=u.id WHERE a.email = ?1`,
  )
    .bind(email)
    .first();

  // Always run a hash comparison to keep timing similar for unknown users.
  const hash = await pbkdf2(password, user?.salt || "playloot-dummy-salt");
  const valid = user ? constantTimeEqual(hash, user.passwordHash) : false;

  if (!user || !valid) {
    await recordAuthFailure(env, request, email);
    return fail("Incorrect email or password", 401, "invalid_credentials");
  }
  if (user.banned) return fail("This account is suspended", 403, "banned");

  const twoStep = await env.DB.prepare(
    "SELECT two_step_secret AS secret, two_step_enabled AS enabled FROM user_settings WHERE user_id = ?1",
  ).bind(user.id).first();
  if (twoStep?.enabled && !(await verifyTotp(await decryptSecret(env, twoStep.secret), payload?.code))) {
    // Counted as a failure so a stolen email cannot be ground down on the 2FA code.
    await recordAuthFailure(env, request, email);
    return fail("Enter a valid authenticator code", 401, "two_step_required");
  }

  await clearAuthFailures(env, request, email);

  await recordLogin(env,request,user.id);
  const session = await createSession(env, user.id, request.headers.get("user-agent"));
  const wallet = await env.DB.prepare(
    "SELECT coins, diamonds, cash_cents AS cashCents FROM wallets WHERE user_id = ?1",
  )
    .bind(user.id)
    .first();

  return json(
    {
      token: session.token,
      expiresAt: iso(session.expiresAt),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        handle: user.handle,
        gamerId: user.handle,
        tier: user.tier,
        level: user.level,
        emailVerified: !!user.emailVerified,
      },
      wallet: {
        coins: wallet?.coins ?? 0,
        diamonds: wallet?.diamonds ?? 0,
        cashCents: wallet?.cashCents ?? 0,
      },
    },
    200,
    { "set-cookie": sessionCookie(session.token, session.maxAge) },
  );
}

// A declared content-type is attacker-controlled, so the leading bytes decide
// what is really stored. Anything else is rejected instead of being served
// back with an image/* type later.
const AVATAR_SIGNATURES = [
  { type: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

function detectImageType(bytes) {
  return AVATAR_SIGNATURES.find((signature) => signature.test(bytes)) || null;
}

async function avatarUploadRoute(request, env, session) {
  const contentType = request.headers.get("content-type") || "";
  if (!ALLOWED_AVATAR_TYPES.includes(contentType.split(";")[0].trim())) {
    return fail("Avatar must be a PNG, JPEG or WebP image", 415, "unsupported_media_type");
  }

  const buffer = new Uint8Array(await request.arrayBuffer());
  if (buffer.byteLength === 0) return fail("Empty upload", 400, "bad_request");
  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    return fail("Avatar must be under 2 MB", 413, "too_large");
  }

  const detected = detectImageType(buffer);
  if (!detected) return fail("That file is not a valid image", 400, "invalid_image");

  const key = `${AVATAR_PREFIX}${session.user.id}/${randomId("img")}.${detected.ext}`;

  await env.MEDIA.put(key, buffer, {
    httpMetadata: { contentType: detected.type },
    customMetadata: { userId: session.user.id },
  });

  await env.DB.prepare("UPDATE users SET avatar_key = ?1 WHERE id = ?2").bind(key, session.user.id).run();

  return { avatarKey: key, avatarUrl: `${publicOrigin(request, env)}/api/avatar/${key}` };
}

async function avatarGetRoute(request, env, key) {
  const object = await env.MEDIA.get(key);
  if (!object) return fail("Not found", 404, "not_found");
  const body = await object.arrayBuffer();
  return new Response(body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "content-length": String(body.byteLength),
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
    },
  });
}

/**
 * Parses a JSON body once, then hands it to a route handler.
 * A malformed body has to fail loudly: the lenient reader turned broken JSON
 * into `null`, which every route then reported as a confusing "field required".
 */
async function withBody(request, handler, successStatus) {
  const { data, error } = await readJsonStrict(request);
  if (error) return error;
  const result = await handler(data);
  if (result instanceof Response) return result;
  return json(result, successStatus);
}

async function router(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204 });

  if (path === "/" || path === "/health") {
    return json({ ok: true, service: "playloot-backend", time: new Date().toISOString() });
  }

  if (path === "/api/auth/register" && method === "POST") return registerRoute(request, env);

  if (path === "/api/auth/login" && method === "POST") return loginRoute(request, env);

  // Public so a freshly deployed backend can tell the frontend which widget it
  // verifies against, removing the need to redeploy the client in lockstep.
  if (path === "/api/config" && method === "GET") {
    return json({
      environment: env.ENVIRONMENT || "development",
      turnstile: turnstileConfig(env),
    });
  }

  if (path === "/api/app-config" && method === "GET") return json(await publicConfigRoute(env));
  if (path === "/api/games/catalog" && method === "GET") return json(await gamesCatalogRoute(env));
  if (path.startsWith("/api/pms-assets/") && method === "GET") return pmsAssetRoute(env, decodeURIComponent(path.slice("/api/pms-assets/".length)));

  if (path.startsWith("/api/pms/")) {
    if (!(await isPmsAdmin(request, env))) return fail("PMS access denied", 401, "pms_unauthorized");
    if (path === '/api/pms/operations') return operationsAdmin(request,env);
    if (path === "/api/pms/reminders") return remindersAdmin(request,env);
    if (path.startsWith("/api/pms/live")) return eventAdmin(request, env, path);
    if (path.startsWith("/api/pms/offers")) return offersAdmin(request, env, path);
    if (path === "/api/pms/config" && method === "GET") return json(await pmsConfigRoute(env));
    if (path === "/api/pms/config" && method === "PUT") return withBody(request, (payload) => savePmsConfigRoute(env, payload));
    if (path === "/api/pms/providers" && method === "GET") return json(await listProvidersRoute(env));
    if (path === "/api/pms/providers" && method === "POST") return withBody(request, (payload) => saveProviderRoute(env, payload));
    if (path === "/api/pms/assets/icon" && method === "POST") return withBody(request, (payload) => uploadPmsIconRoute(request, env, payload), 201);
    if (path.startsWith("/api/pms/providers/") && method === "DELETE") return json(await deleteProviderRoute(env, decodeURIComponent(path.slice("/api/pms/providers/".length))));
    return fail("PMS route not found", 404, "not_found");
  }

  if (path === "/api/live" && method === "GET") return eventPublic(request, env, null, path);
  const isPublic = path.startsWith("/api/avatar/");
  let session = null;
  if (!isPublic) session = await authenticate(request, env);
  if (!session && !isPublic) return fail("Sign in required", 401, "unauthorized");
  if (path === '/api/security/device') return deviceRoute(request,env,session);

  if (path.startsWith("/api/events/") || path.startsWith("/api/game-events/")) return eventPublic(request, env, session, path);

  if (path === "/api/reminders") return remindersPlayer(request,env,session);
  if (path === "/api/offers" || path.startsWith("/api/offers/")) return offersPlayer(request, env, session, path);
  if (path === "/api/auth/logout" && method === "POST") {
    if (session) await destroySession(env, session.tokenHash);
    return json({ ok: true }, 200, { "set-cookie": clearCookie() });
  }

  if (path === "/api/auth/me" && method === "GET") {
    // Flat fields mirror the previous contract; the nested objects carry the
    // extra detail. Both are returned so either client shape keeps working.
    const flat = session.user;
    return json({
      ...flat,
      gamerId: flat.handle,
      user: flat,
      wallet: session.wallet,
      expiresAt: null,
    });
  }

  if (path.startsWith("/api/avatar/") && method === "GET") {
    return avatarGetRoute(request, env, decodeURIComponent(path.slice("/api/avatar/".length)));
  }

  if (path === "/api/profile" && method === "GET") {
    return json(await profileRoute(session, env, publicOrigin(request, env)));
  }

  if (path === "/api/wallet" && method === "GET") {
    return json(await walletRoute(session, env));
  }

  if (path === "/api/leaderboard" && method === "GET") {
    return json(await leaderboardRoute(session, env, publicOrigin(request, env)));
  }

  if (path === "/api/players/search" && method === "GET") {
    return json(await playerSearchRoute(session, env, url.searchParams.get("q"), publicOrigin(request, env)));
  }

  if (path.startsWith("/api/players/") && method === "GET") {
    const playerId = decodeURIComponent(path.slice("/api/players/".length));
    if (!playerId) return fail("Player is required", 400, "bad_request");
    const result = await publicPlayerProfileRoute(session, env, playerId, publicOrigin(request, env));
    return result instanceof Response ? result : json(result);
  }

  if (path === "/api/redeem/options" && method === "GET") {
    return json(await redeemOptionsRoute(session, env));
  }

    if (path === "/api/redeem" && method === "POST") {
      return withBody(request, (payload) => redeemRoute(session, env, payload));
    }

    if (path === "/api/games/play/start" && method === "POST") {
      return withBody(request, (payload) => startPlayRoute(session, env, payload));
    }

    if (path === "/api/games/play/claim" && method === "POST") {
      return withBody(request, (payload) => claimPlayRoute(session, env, payload));
    }

  if (path === "/api/spin" && method === "GET") return json(await spinStatusRoute(session, env));
  if (path === "/api/spin" && method === "POST") {
    const result = await spinRoute(session, env);
    if (result instanceof Response) return result;
    return json(result);
  }

  if (path === "/api/avatar" && method === "POST") {
    const result = await avatarUploadRoute(request, env, session);
    if (result instanceof Response) return result;
    return json(result);
  }

  if (path === "/api/missions" && method === "GET") return json(await missionsRoute(session, env));

    if (path === "/api/missions/claim" && method === "POST") {
      return withBody(request, (payload) => claimMissionRoute(session, env, payload));
    }

  if (path === "/api/rewards" && method === "GET") return json(await rewardsRoute(session, env));

  if (path === "/api/invite" && method === "GET") return json(await inviteRoute(session, env));

  if (path === "/api/daily" && method === "GET") return json(await dailyRoute(session, env));

  if (path === "/api/daily/claim" && method === "POST") {
    const result = await claimDailyRoute(session, env);
    if (result instanceof Response) return result;
    return json(result);
  }

  if (path === "/api/notifications" && method === "GET") return json(await notificationsRoute(session, env));

  if (path === "/api/settings" && method === "GET") return json(await settingsRoute(session, env));

    if (path === "/api/settings" && method === "PATCH") {
      return withBody(request, (payload) => saveSettingsRoute(session, env, payload));
    }

  if (path === "/api/settings/two-step/setup" && method === "POST") {
    const result = await setupTwoStepRoute(session, env);
    if (result instanceof Response) return result;
    return json(result);
  }

    if (path === "/api/settings/two-step/enable" && method === "POST") {
      return withBody(request, (payload) => enableTwoStepRoute(session, env, payload));
    }

    if (path === "/api/settings/two-step/disable" && method === "POST") {
      return withBody(request, (payload) => disableTwoStepRoute(session, env, payload));
    }

  return fail("Not found", 404, "not_found");
}

export default {
  async scheduled(event,env,ctx){ctx.waitUntil(sendReminders(env));},
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    try {
      const response = await router(request, env);
      const merged = new Headers(response.headers);
      headers && Object.entries(headers).forEach(([key, value]) => merged.set(key, value));
      return new Response(response.body, { status: response.status, headers: merged });
    } catch (error) {
      console.error("unhandled", error);
      return json(
        { error: { code: "server_error", message: "Something went wrong" } },
        500,
        headers,
      );
    }
  },
};
