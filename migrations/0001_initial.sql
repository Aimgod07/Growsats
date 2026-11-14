PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  gamer_id TEXT NOT NULL UNIQUE,
  invite_code TEXT NOT NULL UNIQUE,
  invited_by TEXT REFERENCES users(id),
  joined_at TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  diamonds INTEGER NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
  cash INTEGER NOT NULL DEFAULT 0 CHECK (cash >= 0),
  level INTEGER NOT NULL DEFAULT 1,
  tier TEXT NOT NULL DEFAULT 'Bronze',
  avatar_key TEXT,
  settings_json TEXT NOT NULL DEFAULT '{"online":true,"stealth":false,"graphics":"auto","fps":60,"privateProfile":false,"twoStep":false,"rewardAlerts":true}',
  two_step_secret TEXT,
  pending_two_step_secret TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('coins','diamonds')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  source TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX rewards_user_created_idx ON rewards(user_id, created_at DESC);

CREATE TRIGGER reward_wallet_update AFTER INSERT ON rewards BEGIN
  UPDATE users SET
    coins = coins + CASE WHEN NEW.kind = 'coins' THEN NEW.amount ELSE 0 END,
    diamonds = diamonds + CASE WHEN NEW.kind = 'diamonds' THEN NEW.amount ELSE 0 END
  WHERE id = NEW.user_id;
END;

CREATE TABLE plays (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_code TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  claimed_at TEXT,
  seconds INTEGER,
  coins_awarded INTEGER
);
CREATE INDEX plays_user_idx ON plays(user_id, started_at DESC);

CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL REFERENCES users(id),
  invitee_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX referrals_inviter_idx ON referrals(inviter_id);

CREATE TABLE redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount TEXT NOT NULL,
  coins_cost INTEGER NOT NULL CHECK (coins_cost > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
CREATE INDEX redemptions_user_created_idx ON redemptions(user_id, created_at DESC);

CREATE TRIGGER redemption_validate BEFORE INSERT ON redemptions BEGIN
  SELECT CASE WHEN (SELECT coins FROM users WHERE id = NEW.user_id) < NEW.coins_cost
    THEN RAISE(ABORT, 'INSUFFICIENT_COINS') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM redemptions WHERE user_id = NEW.user_id AND substr(created_at, 1, 10) = substr(NEW.created_at, 1, 10)) >= 5
    THEN RAISE(ABORT, 'DAILY_LIMIT') END;
END;
CREATE TRIGGER redemption_wallet_update AFTER INSERT ON redemptions BEGIN
  UPDATE users SET coins = coins - NEW.coins_cost WHERE id = NEW.user_id;
END;

CREATE TABLE auth_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
