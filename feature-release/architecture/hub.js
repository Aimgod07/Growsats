import { fail, randomId, today, iso } from "../lib/util.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";
import { MISSION_CATALOG, DAILY_BONUS_COINS, REFERRAL_BONUS_COINS } from "../lib/hub-catalog.js";

// Every coin/diamond grant goes through here so the wallet, the lifetime
// counter, the rewards ledger and the notification feed stay in sync.
export async function grantReward(env, { userId, source, kind, amount, refId = null }) {
  if (amount <= 0) return;
  const entryId = randomId("rwd");

  const column = kind === "diamonds" ? "diamonds" : "coins";
  const countsLifetime = kind !== "diamonds";
  const lifetime = countsLifetime ? ", lifetime_coins = lifetime_coins + ?3" : "";

  const update = env.DB.prepare(
    `UPDATE wallets SET ${column} = ${column} + ?1${lifetime}, updated_at = datetime('now') WHERE user_id = ?2`,
  );
  const bound = countsLifetime ? update.bind(amount, userId, amount) : update.bind(amount, userId);

  await env.DB.batch([
    bound,
    env.DB.prepare(
      "INSERT INTO reward_ledger (id, user_id, source, kind, amount, ref_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    ).bind(entryId, userId, source, kind, amount, refId),
  ]);

  return entryId;
}

export async function notify(env, userId, text) {
  await env.DB.prepare("INSERT INTO notifications (id, user_id, text) VALUES (?1, ?2, ?3)")
    .bind(randomId("ntf"), userId, text)
    .run();
}

async function activityToday(env, userId) {
  const day = today();
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM play_sessions WHERE user_id = ?1 AND date(started_at) = ?2) AS sessions,
       (SELECT IFNULL(SUM(seconds), 0) FROM play_sessions WHERE user_id = ?1 AND date(started_at) = ?2) AS seconds,
       (SELECT IFNULL(SUM(coins_awarded), 0) FROM play_sessions WHERE user_id = ?1 AND date(started_at) = ?2) AS earned,
       (SELECT COUNT(*) FROM spins WHERE user_id = ?1 AND day = ?2) AS spins`,
  )
    .bind(userId, day)
    .first();

  return {
    sessions: row?.sessions ?? 0,
    seconds: row?.seconds ?? 0,
    earned: row?.earned ?? 0,
    spins: row?.spins ?? 0,
  };
}

export async function resolveInviter(env, inviteCode, newUserId = "") {
  const code = String(inviteCode || "").trim().toUpperCase();
  if (!code) return null;
  const row = await env.DB.prepare(
    "SELECT id FROM users WHERE invite_code = ?1 AND id != ?2",
  )
    .bind(code, newUserId)
    .first();
  return row?.id || null;
}

// Pays the inviter once, on the invitee's first claimed play session.
export async function payReferralBonus(env, inviteeId, currentSessionId = "") {
  const invitee = await env.DB.prepare(
    "SELECT referred_by AS referrerId FROM users WHERE id = ?1",
  )
    .bind(inviteeId)
    .first();
  if (!invitee?.referrerId) return false;

  const prior = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM play_sessions WHERE user_id = ?1 AND claimed = 1 AND id != ?2",
  )
    .bind(inviteeId, currentSessionId)
    .first();
  if ((prior?.count ?? 0) > 0) return false;

  const rewardId=randomId('rwd');
  const [claim]=await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO referral_bonus_claims(invitee_id,reward_id) VALUES(?,?)').bind(inviteeId,rewardId),
    env.DB.prepare(`UPDATE wallets SET coins=coins+?1,lifetime_coins=lifetime_coins+?1,updated_at=datetime('now') WHERE user_id=?2 AND EXISTS(SELECT 1 FROM referral_bonus_claims WHERE reward_id=?3)`).bind(REFERRAL_BONUS_COINS,invitee.referrerId,rewardId),
    env.DB.prepare(`INSERT INTO reward_ledger(id,user_id,source,kind,amount,ref_id) SELECT ?1,?2,'referral','coins',?3,?4 WHERE EXISTS(SELECT 1 FROM referral_bonus_claims WHERE reward_id=?1)`).bind(rewardId,invitee.referrerId,REFERRAL_BONUS_COINS,inviteeId),
  ]);
  if(!claim.meta?.changes)return false;
  await notify(
    env,
    invitee.referrerId,
    `Referral bonus: +${REFERRAL_BONUS_COINS} coins, a friend played their first game`,
  );
  return true;
}

export async function missionsRoute(session, env) {
  const day = today();
  const [activity, claimed] = await Promise.all([
    activityToday(env, session.user.id),
    env.DB.prepare("SELECT mission_id AS missionId FROM mission_claims WHERE user_id = ?1 AND day = ?2")
      .bind(session.user.id, day)
      .all(),
  ]);

  const claimedIds = new Set(claimed.results.map((row) => row.missionId));

  const missions = MISSION_CATALOG.map((mission) => {
    const progress = Math.min(mission.target, activity[mission.metric] ?? 0);
    return {
      id: mission.id,
      title: mission.title,
      progress,
      target: mission.target,
      reward: mission.reward,
      complete: progress >= mission.target,
      claimed: claimedIds.has(mission.id),
    };
  });

  return { day, missions };
}

export async function claimMissionRoute(session, env, payload) {
  const missionId = String(payload?.id || "");
  const mission = MISSION_CATALOG.find((entry) => entry.id === missionId);
  if (!mission) return fail("Unknown mission", 404, "not_found");

  const day = today();
  const activity = await activityToday(env, session.user.id);
  if ((activity[mission.metric] ?? 0) < mission.target) {
    return fail("Mission is not complete yet", 409, "mission_incomplete");
  }

  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO mission_claims (user_id, mission_id, day, coins) VALUES (?1, ?2, ?3, ?4)`,
  )
    .bind(session.user.id, mission.id, day, mission.reward)
    .run();

  if (!inserted.meta?.changes) return fail("Already claimed today", 409, "already_claimed");

  await grantReward(env, {
    userId: session.user.id,
    source: `Mission: ${mission.title}`,
    kind: "coins",
    amount: mission.reward,
    refId: mission.id,
  });
  await notify(env, session.user.id, `Mission complete: +${mission.reward} coins for ${mission.title}`);

  const wallet = await env.DB.prepare("SELECT coins FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();

  return { success: true, coins: wallet?.coins ?? 0 };
}

export async function rewardsRoute(session, env) {
  const [ledger, claims] = await Promise.all([
    env.DB.prepare(
      `SELECT id, source, kind, amount, created_at AS at
         FROM reward_ledger WHERE user_id = ?1
        ORDER BY created_at DESC, rowid DESC LIMIT 50`,
    )
      .bind(session.user.id)
      .all(),
    env.DB.prepare(
      `SELECT id, option_id AS optionId, label, amount, currency, status, created_at AS at
         FROM redemptions WHERE user_id = ?1
        ORDER BY created_at DESC LIMIT 20`,
    )
      .bind(session.user.id)
      .all(),
  ]);

  return {
    rewards: ledger.results.map((row) => ({
      id: row.id,
      source: row.source,
      kind: row.kind === "diamonds" ? "Gems" : "Coins",
      amount: row.amount,
      at: iso(row.at),
    })),
    claims: claims.results.map((row) => ({
      id: row.id,
      option: { optionId: row.optionId, category: row.label, amount: row.amount },
      status: row.status,
      at: iso(row.at),
    })),
    totals: {
      coins: ledger.results.filter((r) => r.kind === "coins").reduce((sum, r) => sum + r.amount, 0),
      diamonds: ledger.results.filter((r) => r.kind === "diamonds").reduce((sum, r) => sum + r.amount, 0),
    },
  };
}

export async function inviteRoute(session, env) {
  const userId = session.user.id;
  let row = await env.DB.prepare("SELECT invite_code AS inviteCode FROM users WHERE id = ?1")
    .bind(userId)
    .first();

  if (!row?.inviteCode) {
    const code = randomId("pl").replace("pl_", "").toUpperCase().slice(0, 8);
    await env.DB.prepare("UPDATE users SET invite_code = ?1 WHERE id = ?2").bind(code, userId).run();
    row = { inviteCode: code };
  }

  const referred = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE referred_by = ?1",
  )
    .bind(userId)
    .first();

  return {
    code: row.inviteCode,
    referrals: referred?.count ?? 0,
    bonusCoins: REFERRAL_BONUS_COINS,
    rewardPerInvite: REFERRAL_BONUS_COINS,
  };
}

export async function dailyRoute(session, env) {
  const day = today();
  const claim = await env.DB.prepare(
    "SELECT coins FROM daily_claims WHERE user_id = ?1 AND day = ?2",
  )
    .bind(session.user.id, day)
    .first();

  return {
    claimed: Boolean(claim),
    coins: DAILY_BONUS_COINS,
    day,
    resetsAt: `${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T00:00:00.000Z`,
  };
}

export async function claimDailyRoute(session, env) {
  const day = today();
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO daily_claims (user_id, day, coins) VALUES (?1, ?2, ?3)`,
  )
    .bind(session.user.id, day, DAILY_BONUS_COINS)
    .run();

  if (!inserted.meta?.changes) return fail("Daily bonus already claimed", 409, "already_claimed");

  await grantReward(env, {
    userId: session.user.id,
    source: "Daily check-in bonus",
    kind: "coins",
    amount: DAILY_BONUS_COINS,
  });
  await notify(env, session.user.id, `Daily bonus: +${DAILY_BONUS_COINS} coins`);

  const wallet = await env.DB.prepare("SELECT coins FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();

  return { success: true, coinsAwarded: DAILY_BONUS_COINS, coins: wallet?.coins ?? 0 };
}

export async function notificationsRoute(session, env) {
  const rows = await env.DB.prepare(
    `SELECT id, text, read_at AS readAt, created_at AS at
       FROM notifications WHERE user_id = ?1
      ORDER BY created_at DESC, rowid DESC LIMIT 30`,
  )
    .bind(session.user.id)
    .all();

  return {
    items: rows.results.map((row) => ({ id: row.id, text: row.text, read: Boolean(row.readAt), at: iso(row.at) })),
    unread: rows.results.filter((row) => !row.readAt).length,
  };
}

export async function settingsRoute(session, env) {
  const row = await env.DB.prepare(
    `SELECT online, stealth, graphics, fps, private_profile, reward_alerts, two_step_enabled
       FROM user_settings WHERE user_id = ?1`,
  )
    .bind(session.user.id)
    .first();

  return {
    online: row ? Boolean(row.online) : true,
    stealth: row ? Boolean(row.stealth) : false,
    graphics: row?.graphics || "auto",
    fps: row?.fps ?? 60,
    privateProfile: row ? Boolean(row.private_profile) : false,
    rewardAlerts: row ? Boolean(row.reward_alerts) : true,
    twoStep: row ? Boolean(row.two_step_enabled) : false,
  };
}

export async function saveSettingsRoute(session, env, payload) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)`,
  )
    .bind(session.user.id)
    .run();

  const current = await settingsRoute(session, env);
  const next = {
    online: typeof payload?.online === "boolean" ? payload.online : current.online,
    stealth: typeof payload?.stealth === "boolean" ? payload.stealth : current.stealth,
    graphics: ["auto", "low", "medium", "high"].includes(payload?.graphics) ? payload.graphics : current.graphics,
    fps: [30, 60, 90, 120].includes(Number(payload?.fps)) ? Number(payload.fps) : current.fps,
    privateProfile:
      typeof payload?.privateProfile === "boolean" ? payload.privateProfile : current.privateProfile,
    rewardAlerts:
      typeof payload?.rewardAlerts === "boolean" ? payload.rewardAlerts : current.rewardAlerts,
    // Read-only here, but the response must be the same shape GET returns.
    twoStep: current.twoStep,
  };

  await env.DB.prepare(
    `UPDATE user_settings
        SET online = ?1, stealth = ?2, graphics = ?3, fps = ?4,
            private_profile = ?5, reward_alerts = ?6, updated_at = datetime('now')
      WHERE user_id = ?7`,
  )
    .bind(
      next.online ? 1 : 0,
      next.stealth ? 1 : 0,
      next.graphics,
      next.fps,
      next.privateProfile ? 1 : 0,
      next.rewardAlerts ? 1 : 0,
      session.user.id,
    )
    .run();

  return next;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32ToBytes(secret) {
  const clean = String(secret || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) bits += BASE32_ALPHABET.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

async function hotp(keyBytes, counter) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, [
    "sign",
  ]);
  const hash = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3];

  return String(code % 1000000).padStart(6, "0");
}

export async function verifyTotp(secret, code, window = 1) {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  const keyBytes = base32ToBytes(secret);
  if (!keyBytes.length) return false;
  const counter = Math.floor(Date.now() / 30000);
  for (let drift = -window; drift <= window; drift += 1) {
    if ((await hotp(keyBytes, counter + drift)) === String(code)) return true;
  }
  return false;
}

export async function setupTwoStepRoute(session, env) {
  const current = await twoStepSecret(env, session.user.id);
  if (current?.enabled) return fail("Two-step authentication is already enabled", 409, "already_enabled");

  const secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));

  await env.DB.prepare("INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)")
    .bind(session.user.id)
    .run();
  await env.DB.prepare(
    "UPDATE user_settings SET two_step_secret = ?1, two_step_enabled = 0 WHERE user_id = ?2",
  )
    .bind(await encryptSecret(env, secret), session.user.id)
    .run();

  return {
    secret,
    // otpauth:// is what authenticator apps and QR scanners consume.
    uri: `otpauth://totp/Playloot:${encodeURIComponent(session.user.email)}?secret=${secret}&issuer=Playloot`,
    issuer: "Playloot",
    account: session.user.email,
  };
}

async function twoStepSecret(env, userId) {
  const row = await env.DB.prepare(
    "SELECT two_step_secret AS secret, two_step_enabled AS enabled FROM user_settings WHERE user_id = ?1",
  )
    .bind(userId)
    .first();
  return row;
}

export async function enableTwoStepRoute(session, env, payload) {
  const code = String(payload?.code || "").replace(/\D/g, "");
  if (code.length !== 6) return fail("Enter the six-digit code", 400, "bad_request");

  const row = await twoStepSecret(env, session.user.id);
  if (!row?.secret) return fail("Start two-step setup first", 400, "not_started");
  if (!(await verifyTotp(await decryptSecret(env, row.secret), code))) {
    return fail("That code is not valid", 400, "invalid_code");
  }

  await env.DB.prepare("UPDATE user_settings SET two_step_enabled = 1 WHERE user_id = ?1")
    .bind(session.user.id)
    .run();

  return { enabled: true, twoStep: true };
}

export async function disableTwoStepRoute(session, env, payload) {
  const code = String(payload?.code || "").replace(/\D/g, "");
  if (code.length !== 6) return fail("Enter the six-digit code", 400, "bad_request");

  const row = await twoStepSecret(env, session.user.id);
  if (!row?.enabled) return fail("Two-step is not enabled", 400, "not_enabled");
  if (!(await verifyTotp(await decryptSecret(env, row.secret), code))) {
    return fail("That code is not valid", 400, "invalid_code");
  }

  await env.DB.prepare(
    "UPDATE user_settings SET two_step_enabled = 0, two_step_secret = NULL WHERE user_id = ?1",
  )
    .bind(session.user.id)
    .run();

  return { enabled: false, twoStep: false };
}
