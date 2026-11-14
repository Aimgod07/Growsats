import { fail, randomId, iso } from "../lib/util.js";
import { SPIN_PRIZES, pickSpinPrize } from "../lib/catalog.js";
import { grantReward, notify, payReferralBonus } from "./hub.js";
import {atomicReward} from '../lib/claim.js';

const DEFAULT_MIN_SECONDS = 120;
const DEFAULT_MAX_ACTIVE_SESSIONS = 3;
const DEFAULT_ACTIVE_WINDOW_MINUTES = 60;
const DEFAULT_DAILY_EARN_CAP = 20000;

const minClaimSeconds = (env) => Number(env.MIN_CLAIM_SECONDS || DEFAULT_MIN_SECONDS);
const maxActiveSessions = (env) => Number(env.MAX_ACTIVE_SESSIONS || DEFAULT_MAX_ACTIVE_SESSIONS);
const activeWindowMinutes = (env) => Number(env.ACTIVE_SESSION_WINDOW_MINUTES || DEFAULT_ACTIVE_WINDOW_MINUTES);
const dailyEarnCap = (env) => Number(env.DAILY_EARN_CAP || DEFAULT_DAILY_EARN_CAP);

export async function startPlayRoute(session, env, payload) {
  const gameCode = payload?.gameCode;
  if (typeof gameCode!=='string'||!gameCode.trim()||gameCode.length>64) return fail("Valid gameCode is required", 400, "bad_request");

  // Without a cap a client can open unlimited sessions by spamming this route.
  const active = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM play_sessions
      WHERE user_id = ?1 AND claimed = 0
        AND started_at > datetime('now', ?2)`,
  )
    .bind(session.user.id, `-${activeWindowMinutes(env)} minutes`)
    .first();

  if ((active?.count ?? 0) >= maxActiveSessions(env)) {
    return fail("Close or claim an active game first", 429, "too_many_sessions");
  }

  const id = randomId("ply");
  const created=await env.DB.prepare(
    `INSERT INTO play_sessions (id, user_id, game_code, game_title)
     SELECT ?1, ?2, ?3, ?4 WHERE (SELECT COUNT(*) FROM play_sessions WHERE user_id=?2 AND claimed=0 AND started_at>datetime('now',?5))<?6`,
  )
    .bind(id, session.user.id, gameCode, typeof payload?.title==='string'?payload.title.slice(0,150):null,`-${activeWindowMinutes(env)} minutes`,maxActiveSessions(env))
    .run();
  if(!created.meta?.changes)return fail('Too many active games',429,'too_many_sessions');

  return {
    sessionId: id,
    coinsPerMinute: Number(env.COINS_PER_MINUTE || 10),
    minClaimSeconds: minClaimSeconds(env),
  };
}

export async function claimPlayRoute(session, env, payload) {
  const sessionId = payload?.sessionId;
  if (!sessionId) return fail("sessionId is required", 400, "bad_request");

  const play = await env.DB.prepare(
    "SELECT id, claimed, game_code AS gameCode, game_title AS title, IFNULL((SELECT seconds FROM game_session_time WHERE session_id=play_sessions.id),0) AS elapsedSeconds FROM play_sessions WHERE id = ?1 AND user_id = ?2",
  )
    .bind(sessionId, session.user.id)
    .first();

  if (!play) return fail("Play session not found", 409, "invalid_session");
  if (play.claimed) return fail("This session was already claimed", 409, "already_claimed");
  const elapsed = Math.max(0, Number(play.elapsedSeconds || 0));
  if (elapsed < minClaimSeconds(env)) return fail("Play a little longer to claim", 409, "too_soon");
  const cap = Number(env.MAX_CLAIM_SECONDS || 7200);
  const clamped = Math.min(elapsed, cap);
  const coins = Math.floor((clamped - minClaimSeconds(env)) / 60) * 10;

  // Stop the start/stop loop from turning into an unbounded faucet.
  const earnedToday = await env.DB.prepare(
    `SELECT IFNULL(SUM(coins_awarded), 0) AS total FROM play_sessions
      WHERE user_id = ?1 AND claimed_day = date('now')`,
  )
    .bind(session.user.id)
    .first();

  const limit = dailyEarnCap(env);
  if ((earnedToday?.total ?? 0) + coins > limit) {
    return fail("Daily earning limit reached. Come back tomorrow", 429, "daily_limit");
  }

  const rewardId = randomId("rwd");
  const claim = env.DB.prepare(
    `UPDATE play_sessions
        SET seconds = ?1, coins_awarded = ?2, claimed = 1, last_seen_at = datetime('now'),reward_id=?5,claimed_day=date('now')
      WHERE id = ?3 AND user_id = ?4 AND claimed = 0
        AND (SELECT IFNULL(SUM(coins_awarded),0) FROM play_sessions WHERE user_id=?4 AND claimed_day=date('now'))+?2<=?6`,
  )
    .bind(clamped, coins, sessionId, session.user.id,rewardId,limit);

  const statements = [claim];
  if (coins > 0) {
    // D1 batches are atomic. The unique reward id ties the wallet increment to
    // this claim, and the existing ref id prevents a concurrent duplicate.
    statements.push(
      env.DB.prepare(
        `INSERT INTO reward_ledger (id, user_id, source, kind, amount, ref_id)
         SELECT ?1, ?2, ?3, 'coins', ?4, ?5
           FROM play_sessions
          WHERE id = ?5 AND user_id = ?2 AND claimed = 1 AND reward_id=?1
            AND NOT EXISTS (SELECT 1 FROM reward_ledger WHERE ref_id = ?5 AND kind = 'coins')`,
      ).bind(rewardId, session.user.id, `Playing ${play.title || play.gameCode}`, coins, sessionId),
      env.DB.prepare(
        `UPDATE wallets SET coins = coins + ?1, lifetime_coins = lifetime_coins + ?1,
                updated_at = datetime('now')
          WHERE user_id = ?2 AND EXISTS (SELECT 1 FROM reward_ledger WHERE id = ?3)`,
      ).bind(coins, session.user.id, rewardId),
    );
  }
  const result = await env.DB.batch(statements);
  if (!result[0].meta?.changes) return fail("This session was already claimed", 409, "already_claimed");

  if (coins > 0) {
    await Promise.allSettled([
      notify(env, session.user.id, `Play reward: +${coins} coins from ${play.title || play.gameCode}`),
      payReferralBonus(env, session.user.id, sessionId),
    ]);
  }

  const wallet = await env.DB.prepare("SELECT coins, diamonds FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();

  return { coinsAwarded: coins, seconds: clamped, coins: wallet.coins, diamonds: wallet.diamonds };
}

export async function spinStatusRoute(session, env) {
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare("SELECT prize_kind AS kind, prize_value AS value FROM spins WHERE user_id = ?1 AND day = ?2")
    .bind(session.user.id, day)
    .first();

  return {
    available: !row,
    alreadySpunToday: !!row,
    lastPrize: row || null,
    prizes: SPIN_PRIZES.map(({ id, kind, value }) => ({ id, kind, value })),
  };
}

export async function spinRoute(session, env) {
  const day = new Date().toISOString().slice(0, 10);
  const prize = pickSpinPrize();

  const inserted=await atomicReward(env,{table:'spins',columns:'id,user_id,day,prize_kind,prize_value,coins,diamonds',values:[randomId('spn'),session.user.id,day,prize.kind,prize.value,prize.kind==='coins'?prize.value:0,prize.kind==='diamonds'?prize.value:0],userId:session.user.id,kind:prize.kind==='coins'?'coins':'diamonds',amount:prize.value,source:'Lucky Spin Vault',refId:day});
  if(!inserted)return fail('You already spun today',409,'already_spun');

  const label = prize.kind === "coins" ? `${prize.value} coins` : `${prize.value} gems`;
  await notify(env, session.user.id, `Lucky spin won ${label}`).catch(()=>{});

  const wallet = await env.DB.prepare("SELECT coins, diamonds FROM wallets WHERE user_id = ?1")
    .bind(session.user.id)
    .first();

  return { prize: { id: prize.id, kind: prize.kind, value: prize.value }, coins: wallet.coins, diamonds: wallet.diamonds };
}
