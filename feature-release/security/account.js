import { fail, randomId, today, addDays, iso } from "../lib/util.js";
import { REDEMPTIONS_PER_DAY, REDEEM_CATALOG, findRedeemOption } from "../lib/catalog.js";
import { BADGE_CATALOG } from "../lib/hub-catalog.js";

export async function profileRoute(session, env, origin) {
  const stats = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM play_sessions WHERE user_id = ?1 AND (claimed = 1 OR seconds > 0 OR EXISTS (SELECT 1 FROM game_session_time t WHERE t.session_id=play_sessions.id AND t.seconds>0)))   AS games_played,
       (SELECT IFNULL(SUM(MAX(IFNULL(p.seconds,0),IFNULL(t.seconds,0))),0) FROM play_sessions p LEFT JOIN game_session_time t ON t.session_id=p.id WHERE p.user_id=?1) AS seconds_played,
       (SELECT COUNT(*) FROM redemptions WHERE user_id = ?1)                AS redemptions,
       (SELECT IFNULL(lifetime_coins, 0) FROM wallets WHERE user_id = ?1)   AS lifetime_coins,
       (SELECT COUNT(*) FROM spins WHERE user_id = ?1)                      AS spins,
       (SELECT COUNT(*) FROM users WHERE referred_by = ?1)                 AS referrals,
       (SELECT COUNT(*) FROM reward_ledger WHERE user_id = ?1)              AS reward_count,
       (SELECT IFNULL(SUM(amount), 0) FROM reward_ledger
         WHERE user_id = ?1 AND kind = 'coins')                             AS coins_earned`,
  )
    .bind(session.user.id)
    .first();

  // Abandoned sessions are not "played" games, so they stay out of the list.
  const recent = await env.DB.prepare(
    `SELECT game_code AS gameCode, game_title AS title, started_at AS at, MAX(IFNULL(seconds,0),IFNULL((SELECT t.seconds FROM game_session_time t WHERE t.session_id=play_sessions.id),0)) AS seconds
       FROM play_sessions WHERE user_id = ?1 AND (claimed = 1 OR seconds > 0 OR EXISTS (SELECT 1 FROM game_session_time t WHERE t.session_id=play_sessions.id AND t.seconds>0))
      ORDER BY started_at DESC, rowid DESC LIMIT 5`,
  )
    .bind(session.user.id)
    .all();

  const shared = {
    gamesPlayed: stats?.games_played ?? 0,
    secondsPlayed: stats?.seconds_played ?? 0,
    hoursPlayed: Math.floor((stats?.seconds_played ?? 0) / 3600),
    redemptions: stats?.redemptions ?? 0,
    lifetimeCoins: stats?.lifetime_coins ?? session.wallet.coins,
    spins: stats?.spins ?? 0,
    referrals: stats?.referrals ?? 0,
    // Count, matching "Games played" / "Friends invited" beside it.
    rewardsEarned: stats?.reward_count ?? 0,
    coinsEarned: stats?.coins_earned ?? 0,
  };

  return {
    id: session.user.id,
    gamerId: session.user.handle,
    name: session.user.name,
    handle: session.user.handle,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    avatarUrl: session.user.avatarKey ? `${origin}/api/avatar/${session.user.avatarKey}` : null,
    country: { code: session.user.countryCode },
    tier: session.user.tier,
    level: session.user.level,
    dateJoined: iso(session.user.createdAt),
    wallet: {
      coins: session.wallet.coins,
      diamonds: session.wallet.diamonds,
      cashCents: session.wallet.cashCents,
    },
    stats: {
      gamesPlayed: shared.gamesPlayed,
      hoursPlayed: shared.hoursPlayed,
      secondsPlayed: shared.secondsPlayed,
      redemptions: shared.redemptions,
      lifetimeCoins: shared.lifetimeCoins,
      spins: shared.spins,
      rewardsEarned: shared.rewardsEarned,
      coinsEarned: shared.coinsEarned,
      referrals: shared.referrals,
    },
    badges: BADGE_CATALOG.map((badge) => ({
      id: badge.id,
      title: badge.title,
      earned: badge.check(shared),
    })),
    recentGames: recent.results.map((row) => ({
      gameCode: row.gameCode,
      title: row.title || row.gameCode,
      seconds: row.seconds,
      at: iso(row.at),
    })),
  };
}

export async function walletRoute(session, env) {
  const row = await env.DB.prepare("SELECT updated_at AS updatedAt FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();

  return {
    coins: session.wallet.coins,
    diamonds: session.wallet.diamonds,
    cashCents: session.wallet.cashCents,
    cash: (session.wallet.cashCents / 100).toFixed(2),
    // Read from the row rather than stamped per request, which always said "now".
    updatedAt: iso(row?.updatedAt) || iso(new Date()),
  };
}

export async function leaderboardRoute(session, env, origin = "") {
  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.handle, u.tier, u.level, u.avatar_key, w.coins, w.diamonds
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE u.banned = 0
        -- Honour the privacy toggles from /api/settings, otherwise players who
        -- opted out would still be published on the board.
        AND IFNULL(s.private_profile, 0) = 0
        AND IFNULL(s.stealth, 0) = 0
        AND IFNULL(s.online, 1) = 1
      ORDER BY w.coins DESC
      LIMIT 25`,
  ).all();

  const players = rows.results.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    gamerId: row.handle,
    name: row.name,
    handle: row.handle,
    tier: row.tier,
    level: row.level,
    coins: row.coins,
    diamonds: row.diamonds,
    avatarUrl: row.avatar_key && origin ? `${origin}/api/avatar/${row.avatar_key}` : null,
  }));

  // Rank everyone, not just the visible slice, so a player below the cut-off
  // sees their real position instead of a misleading "hidden" message.
  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS count
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE u.banned = 0
        AND IFNULL(s.private_profile, 0) = 0
        AND IFNULL(s.stealth, 0) = 0
        AND IFNULL(s.online, 1) = 1`,
  ).first();

  let me = players.find((player) => player.id === session.user.id) || null;
  if (!me) {
    const ranked = await env.DB.prepare(
      `SELECT u.id, u.name, u.handle, u.tier, u.level, u.avatar_key, w.coins, w.diamonds,
              (SELECT COUNT(*) + 1 FROM wallets w2
                 JOIN users u2 ON u2.id = w2.user_id
                 LEFT JOIN user_settings s2 ON s2.user_id = u2.id
                WHERE u2.banned = 0 AND w2.coins > w.coins
                  AND IFNULL(s2.private_profile, 0) = 0
                  AND IFNULL(s2.stealth, 0) = 0
                  AND IFNULL(s2.online, 1) = 1) AS rank
         FROM wallets w
         JOIN users u ON u.id = w.user_id
        WHERE u.id = ?1`,
    )
      .bind(session.user.id)
      .first();

    if (ranked) {
      me = {
        rank: ranked.rank,
        id: ranked.id,
        gamerId: ranked.handle,
        name: ranked.name,
        handle: ranked.handle,
        tier: ranked.tier,
        level: ranked.level,
        coins: ranked.coins,
        diamonds: ranked.diamonds,
        avatarUrl: ranked.avatar_key && origin ? `${origin}/api/avatar/${ranked.avatar_key}` : null,
      };
    }
  }

  const nextReset = addDays(1).slice(0, 10);

  return {
    players,
    me,
    totalPlayers: total?.count ?? players.length,
    resetAt: `${nextReset}T00:00:00.000Z`,
  };
}

function publicAvatar(row, origin) {
  return row.avatar_key && origin ? `${origin}/api/avatar/${row.avatar_key}` : null;
}

export async function playerSearchRoute(session, env, query, origin = "") {
  const term = String(query || "").trim().slice(0, 50);
  if (term.length < 2) return { players: [] };
  const match = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.handle, u.tier, u.level, u.avatar_key, w.coins
       FROM users u JOIN wallets w ON w.user_id = u.id
       LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE u.banned = 0 AND IFNULL(s.private_profile, 0) = 0 AND IFNULL(s.stealth, 0) = 0
        AND (u.name LIKE ?1 ESCAPE '\\' COLLATE NOCASE OR u.handle LIKE ?1 ESCAPE '\\' COLLATE NOCASE)
      ORDER BY CASE WHEN u.handle = ?2 COLLATE NOCASE THEN 0 ELSE 1 END, w.coins DESC, u.name ASC LIMIT 20`,
  ).bind(match, term).all();
  return { players: rows.results.map((row) => ({
    id: row.id, name: row.name, gamerId: row.handle, handle: row.handle,
    tier: row.tier, level: row.level, coins: row.coins, avatarUrl: publicAvatar(row, origin),
  })) };
}

export async function publicPlayerProfileRoute(session, env, playerId, origin = "") {
  const row = await env.DB.prepare(
    `SELECT u.id, u.name, u.handle, u.tier, u.level, u.avatar_key, u.created_at,
            w.coins, w.diamonds, w.lifetime_coins, IFNULL(s.private_profile, 0) AS private_profile,
            IFNULL(s.stealth, 0) AS stealth
       FROM users u JOIN wallets w ON w.user_id = u.id
       LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?1 AND u.banned = 0`,
  ).bind(playerId).first();
  if (!row) return fail("Player not found", 404, "not_found");
  const isMe = row.id === session.user.id;
  if (!isMe && (row.private_profile || row.stealth)) return fail("This profile is private", 403, "private_profile");
  const stats = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM play_sessions WHERE user_id = ?1 AND (claimed = 1 OR seconds > 0 OR EXISTS (SELECT 1 FROM game_session_time t WHERE t.session_id=play_sessions.id AND t.seconds>0))) AS games_played,
       (SELECT IFNULL(SUM(MAX(IFNULL(p.seconds,0),IFNULL(t.seconds,0))),0) FROM play_sessions p LEFT JOIN game_session_time t ON t.session_id=p.id WHERE p.user_id=?1) AS seconds_played,
       (SELECT COUNT(*) FROM reward_ledger WHERE user_id = ?1) AS reward_count,
       (SELECT IFNULL(SUM(amount), 0) FROM reward_ledger WHERE user_id = ?1 AND kind = 'coins') AS coins_earned,
       (SELECT COUNT(*) FROM users WHERE referred_by = ?1) AS referrals`,
  ).bind(row.id).first();
  const recent = await env.DB.prepare(
    `SELECT game_code AS gameCode, game_title AS title, started_at AS at, MAX(IFNULL(seconds,0),IFNULL((SELECT t.seconds FROM game_session_time t WHERE t.session_id=play_sessions.id),0)) AS seconds
       FROM play_sessions WHERE user_id = ?1 AND (claimed = 1 OR seconds > 0 OR EXISTS (SELECT 1 FROM game_session_time t WHERE t.session_id=play_sessions.id AND t.seconds>0)) ORDER BY started_at DESC, rowid DESC LIMIT 5`,
  ).bind(row.id).all();
  const rank = await env.DB.prepare(
    `SELECT COUNT(*) + 1 AS rank FROM wallets w JOIN users u ON u.id = w.user_id
       LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.banned = 0 AND w.coins > ?1
       AND IFNULL(s.private_profile, 0) = 0 AND IFNULL(s.stealth, 0) = 0`,
  ).bind(row.coins).first();
  const shared = {
    gamesPlayed: stats?.games_played ?? 0, secondsPlayed: stats?.seconds_played ?? 0,
    hoursPlayed: Math.floor((stats?.seconds_played ?? 0) / 3600),
    rewardsEarned: stats?.reward_count ?? 0, coinsEarned: stats?.coins_earned ?? 0,
    referrals: stats?.referrals ?? 0, lifetimeCoins: row.lifetime_coins ?? row.coins, redemptions: 0, spins: 0,
  };
  return {
    id: row.id, name: row.name, gamerId: row.handle, handle: row.handle, tier: row.tier, level: row.level,
    avatarUrl: publicAvatar(row, origin), dateJoined: iso(row.created_at), coins: row.coins, diamonds: row.diamonds,
    rank: rank?.rank ?? null, isMe, stats: shared,
    badges: BADGE_CATALOG.map((badge) => ({ id: badge.id, title: badge.title, earned: badge.check(shared) })),
    recentGames: recent.results.map((game) => ({ gameCode: game.gameCode, title: game.title || game.gameCode, seconds: game.seconds, at: iso(game.at) })),
  };
}

export async function redeemOptionsRoute(session, env) {
  const day = today();
  const used = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM redemptions WHERE user_id = ?1 AND date(created_at) = ?2",
  )
    .bind(session.user.id, day)
    .first();

  const history = await env.DB.prepare(
    `SELECT id, option_id AS optionId, label, coins_spent AS coinsSpent,
            amount, currency, status, created_at AS createdAt
       FROM redemptions
      WHERE user_id = ?1
      ORDER BY created_at DESC
      LIMIT 20`,
  )
    .bind(session.user.id)
    .all();

  return {
    catalog: REDEEM_CATALOG,
    // Flat list for the Rewards tab: { id, category, amount, coinsRequired }.
    options: REDEEM_CATALOG.flatMap((category) =>
      category.options.map((option) => ({
        id: option.id,
        category: category.title,
        amount: `${option.currency}${option.amount}`,
        coinsRequired: option.coinsRequired,
      })),
    ),
    coins: session.wallet.coins,
    redemptionsUsedToday: used?.count ?? 0,
    redemptionsAllowedPerDay: REDEMPTIONS_PER_DAY,
    history: history.results.map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
  };
}

export async function redeemRoute(session, env, payload) {
  const optionId = payload?.optionId;
  if (!optionId) return fail("optionId is required", 400, "bad_request");
  const key=payload?.idempotencyKey??null;
  if(key!==null&&(typeof key!=='string'||! /^[a-zA-Z0-9_-]{16,100}$/.test(key)))return fail('Invalid request key',400);
  async function replay(){
    if(!key)return null;
    const old=await env.DB.prepare('SELECT id,option_id AS optionId,label,coins_spent AS coinsSpent,amount,currency,status,created_at AS createdAt FROM redemptions WHERE user_id=? AND idempotency_key=?').bind(session.user.id,key).first();
    if(!old)return null;
    if(old.optionId!==optionId)return fail('Request key already used for another reward',409);
    const wallet=await env.DB.prepare('SELECT coins FROM wallets WHERE user_id=?').bind(session.user.id).first();
    return {success:true,redemption:old,coins:wallet.coins};
  }
  const existing=await replay();if(existing)return existing;

  const match = findRedeemOption(optionId);
  if (!match) return fail("Unknown redeem option", 404, "not_found");
  const { category, option } = match;

  const day = today();
  const used = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM redemptions WHERE user_id = ?1 AND date(created_at) = ?2",
  )
    .bind(session.user.id, day)
    .first();
  if ((used?.count ?? 0) >= REDEMPTIONS_PER_DAY) {
    return fail("Daily redemption limit reached", 429, "limit_reached");
  }

  const wallet = await env.DB.prepare("SELECT coins FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();
  if (!wallet) return fail("Wallet not found", 404, "not_found");
  if (wallet.coins < option.coinsRequired) {
    return fail(`You need ${option.coinsRequired - wallet.coins} more coins`, 409, "insufficient_coins");
  }

  const redemptionId = randomId("rdm");
  const label = `${category.title.replace("Redeem Coins as ", "")} ${option.currency}${option.amount}`;

  // Both statements run in one D1 transaction. The insert is conditional on the
  // live balance and the debit only fires for an insert that actually landed,
  // so a crash between them can neither mint a free claim nor burn coins for a
  // claim that was never recorded.
  const [inserted] = await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO redemptions (id, user_id, option_id, label, coins_spent, amount, currency, status,idempotency_key)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending',?9
        WHERE (SELECT coins FROM wallets WHERE user_id = ?2) >= ?5
          AND (SELECT COUNT(*) FROM redemptions WHERE user_id=?2 AND date(created_at)=date('now'))<?8`,
    ).bind(redemptionId, session.user.id, option.id, label, option.coinsRequired, option.amount, option.currency,REDEMPTIONS_PER_DAY,key),
    env.DB.prepare(
      `UPDATE wallets SET coins = coins - ?1, updated_at = datetime('now')
        WHERE user_id = ?2 AND EXISTS (SELECT 1 FROM redemptions WHERE id = ?3)`,
    ).bind(option.coinsRequired, session.user.id, redemptionId),
  ]);

  if (!inserted.meta?.changes) {
    const existing=await replay();if(existing)return existing;
    return fail("You need more coins for that reward", 409, "insufficient_coins");
  }

  const after = await env.DB.prepare("SELECT coins FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();

  return {
    success: true,
    redemption: {
      id: redemptionId,
      optionId: option.id,
      label,
      coinsSpent: option.coinsRequired,
      amount: option.amount,
      currency: option.currency,
      status: "pending",
      createdAt: iso(new Date()),
    },
    coins: after.coins,
  };
}
