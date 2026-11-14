-- Additive migration: retain legacy columns for compatibility and safe rollback.
CREATE TABLE user_authentication (
 user_id TEXT PRIMARY KEY REFERENCES users(id), email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, salt TEXT NOT NULL, password_algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256-100000',
 signup_ip TEXT, last_login_ip TEXT, last_login_at TEXT, login_count INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO user_authentication(user_id,email,password_hash,salt,created_at)
 SELECT id,email,password_hash,salt,created_at FROM users;
CREATE TRIGGER auth_user_insert AFTER INSERT ON users BEGIN
 INSERT INTO user_authentication(user_id,email,password_hash,salt,created_at) VALUES(NEW.id,NEW.email,NEW.password_hash,NEW.salt,NEW.created_at);
END;
CREATE TRIGGER auth_user_update AFTER UPDATE OF email,password_hash,salt ON users BEGIN
 UPDATE user_authentication SET email=NEW.email,password_hash=NEW.password_hash,salt=NEW.salt,updated_at=datetime('now') WHERE user_id=NEW.id;
END;

ALTER TABLE wallets ADD COLUMN loot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR';
CREATE TABLE transaction_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
 asset TEXT NOT NULL CHECK(asset IN ('coins','diamonds','cash_cents','loot')),
 amount INTEGER NOT NULL, balance_before INTEGER NOT NULL, balance_after INTEGER NOT NULL,
 event TEXT NOT NULL, reference_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
 CHECK(balance_after=balance_before+amount)
);
CREATE INDEX transaction_user ON transaction_log(user_id,id DESC);
-- Only balances known at migration time are recorded; no invented historical transactions.
INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event)
 SELECT user_id,'coins',coins,0,coins,'migration_opening' FROM wallets;
INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event) SELECT user_id,'diamonds',diamonds,0,diamonds,'migration_opening' FROM wallets;
INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event) SELECT user_id,'cash_cents',cash_cents,0,cash_cents,'migration_opening' FROM wallets;
INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event) SELECT user_id,'loot',loot,0,loot,'migration_opening' FROM wallets;
CREATE TRIGGER transaction_no_update BEFORE UPDATE ON transaction_log BEGIN SELECT RAISE(ABORT,'Transaction history is append only'); END;
CREATE TRIGGER transaction_no_delete BEFORE DELETE ON transaction_log BEGIN SELECT RAISE(ABORT,'Transaction history is append only'); END;
CREATE TRIGGER wallet_no_delete BEFORE DELETE ON wallets BEGIN SELECT RAISE(ABORT,'Wallets must be retained for audit'); END;
CREATE TRIGGER wallet_identity BEFORE UPDATE OF user_id,currency ON wallets WHEN NEW.user_id!=OLD.user_id OR NEW.currency!=OLD.currency BEGIN SELECT RAISE(ABORT,'Wallet identity and currency cannot be changed'); END;

CREATE TABLE withdrawals (
 id TEXT PRIMARY KEY REFERENCES redemptions(id), user_id TEXT NOT NULL REFERENCES users(id),
 option_id TEXT NOT NULL, label TEXT NOT NULL, coins_spent INTEGER NOT NULL,
 amount TEXT NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO withdrawals(id,user_id,option_id,label,coins_spent,amount,currency,status,created_at)
 SELECT id,user_id,option_id,label,coins_spent,amount,currency,status,created_at FROM redemptions;
CREATE INDEX withdrawals_user ON withdrawals(user_id,created_at DESC);
CREATE TRIGGER withdrawal_insert AFTER INSERT ON redemptions BEGIN
 INSERT INTO withdrawals(id,user_id,option_id,label,coins_spent,amount,currency,status,created_at)
 VALUES(NEW.id,NEW.user_id,NEW.option_id,NEW.label,NEW.coins_spent,NEW.amount,NEW.currency,NEW.status,NEW.created_at);
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,'coins',0,coins,coins,'withdrawal_'||NEW.status,NEW.id FROM wallets WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER withdrawal_update AFTER UPDATE ON redemptions BEGIN
 UPDATE withdrawals SET status=NEW.status,updated_at=datetime('now') WHERE id=NEW.id;
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,'coins',0,coins,coins,'withdrawal_'||NEW.status,NEW.id FROM wallets WHERE user_id=NEW.user_id AND NEW.status!=OLD.status;
END;
CREATE TABLE deposits (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
 asset TEXT NOT NULL CHECK(asset IN ('coins','diamonds','cash_cents','loot')),
 amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount>0 AND amount<=1000000000),
 currency TEXT NOT NULL DEFAULT 'INR', provider TEXT NOT NULL, external_reference TEXT NOT NULL,
 evidence TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status='confirmed'),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(provider,external_reference)
);
CREATE INDEX deposits_user ON deposits(user_id,created_at DESC);
CREATE TRIGGER deposit_credit AFTER INSERT ON deposits BEGIN
 UPDATE wallets SET coins=coins+CASE WHEN NEW.asset='coins' THEN NEW.amount ELSE 0 END,
 diamonds=diamonds+CASE WHEN NEW.asset='diamonds' THEN NEW.amount ELSE 0 END,
 cash_cents=cash_cents+CASE WHEN NEW.asset='cash_cents' THEN NEW.amount ELSE 0 END,
 loot=loot+CASE WHEN NEW.asset='loot' THEN NEW.amount ELSE 0 END,updated_at=datetime('now') WHERE user_id=NEW.user_id;
 SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'Wallet missing') END;
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,NEW.asset,0,CASE NEW.asset WHEN 'coins' THEN coins WHEN 'diamonds' THEN diamonds WHEN 'loot' THEN loot ELSE cash_cents END,
 CASE NEW.asset WHEN 'coins' THEN coins WHEN 'diamonds' THEN diamonds WHEN 'loot' THEN loot ELSE cash_cents END,'deposit_confirmed',NEW.id FROM wallets WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER deposit_no_update BEFORE UPDATE ON deposits BEGIN SELECT RAISE(ABORT,'Confirmed deposits are immutable'); END;
CREATE TRIGGER deposit_no_delete BEFORE DELETE ON deposits BEGIN SELECT RAISE(ABORT,'Confirmed deposits are immutable'); END;

CREATE TABLE referrals (
 user_id TEXT PRIMARY KEY REFERENCES users(id), referral_code TEXT UNIQUE,
 referrer_id TEXT REFERENCES users(id), acquisition_source TEXT NOT NULL DEFAULT 'direct',
 created_at TEXT NOT NULL, CHECK(referrer_id IS NULL OR referrer_id!=user_id)
);
INSERT INTO referrals SELECT id,invite_code,referred_by,CASE WHEN referred_by IS NULL THEN 'direct' ELSE 'invite_code' END,created_at FROM users;
CREATE INDEX referrals_parent ON referrals(referrer_id);
CREATE TRIGGER referral_insert AFTER INSERT ON users BEGIN
 INSERT INTO referrals VALUES(NEW.id,NEW.invite_code,NEW.referred_by,CASE WHEN NEW.referred_by IS NULL THEN 'direct' ELSE 'invite_code' END,NEW.created_at);
END;
CREATE TRIGGER referral_update AFTER UPDATE OF invite_code,referred_by ON users BEGIN
 UPDATE referrals SET referral_code=NEW.invite_code,referrer_id=NEW.referred_by,acquisition_source=CASE WHEN NEW.referred_by IS NULL THEN 'direct' ELSE 'invite_code' END WHERE user_id=NEW.id;
END;
CREATE TABLE referral_earnings (
 ledger_id TEXT PRIMARY KEY REFERENCES reward_ledger(id), referrer_id TEXT NOT NULL REFERENCES users(id),
 referred_user_id TEXT NOT NULL REFERENCES users(id), asset TEXT NOT NULL, amount INTEGER NOT NULL, created_at TEXT NOT NULL
);
INSERT INTO referral_earnings SELECT r.id,r.user_id,r.ref_id,r.kind,r.amount,r.created_at FROM reward_ledger r JOIN users u ON u.id=r.ref_id WHERE r.source='referral';
CREATE INDEX referral_earning_parent ON referral_earnings(referrer_id,referred_user_id);
CREATE TRIGGER referral_earning_insert AFTER INSERT ON reward_ledger WHEN NEW.source='referral' BEGIN
 INSERT INTO referral_earnings VALUES(NEW.id,NEW.user_id,NEW.ref_id,NEW.kind,NEW.amount,NEW.created_at);
END;
CREATE TABLE referral_bonus_claims (invitee_id TEXT PRIMARY KEY REFERENCES users(id),reward_id TEXT NOT NULL UNIQUE);
CREATE TRIGGER reward_audit AFTER INSERT ON reward_ledger WHEN NEW.kind IN ('coins','diamonds','loot','cash_cents') BEGIN
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,NEW.kind,0,CASE NEW.kind WHEN 'coins' THEN coins WHEN 'diamonds' THEN diamonds WHEN 'loot' THEN loot ELSE cash_cents END,
 CASE NEW.kind WHEN 'coins' THEN coins WHEN 'diamonds' THEN diamonds WHEN 'loot' THEN loot ELSE cash_cents END,'reward_recorded',NEW.id FROM wallets WHERE user_id=NEW.user_id;
END;
INSERT OR IGNORE INTO referral_bonus_claims SELECT referred_user_id,ledger_id FROM referral_earnings;

CREATE TABLE device_fingerprints (
 id TEXT PRIMARY KEY, model TEXT NOT NULL DEFAULT '', operating_system TEXT NOT NULL DEFAULT '',
 platform TEXT NOT NULL DEFAULT '', browser TEXT NOT NULL DEFAULT '', user_agent TEXT NOT NULL DEFAULT '',
 screen TEXT NOT NULL DEFAULT '', timezone TEXT NOT NULL DEFAULT '', language TEXT NOT NULL DEFAULT '',
 first_ip TEXT, last_ip TEXT, first_seen TEXT NOT NULL DEFAULT (datetime('now')), last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE user_devices (
 user_id TEXT NOT NULL REFERENCES users(id), fingerprint_id TEXT NOT NULL REFERENCES device_fingerprints(id),
 first_seen TEXT NOT NULL DEFAULT (datetime('now')), last_seen TEXT NOT NULL DEFAULT (datetime('now')),
 last_ip TEXT, trust_score INTEGER NOT NULL DEFAULT 100 CHECK(trust_score BETWEEN 0 AND 100),
 risk_reasons TEXT NOT NULL DEFAULT '[]', PRIMARY KEY(user_id,fingerprint_id)
);
CREATE INDEX devices_shared ON user_devices(fingerprint_id,user_id);
CREATE INDEX devices_ip ON user_devices(last_ip);
CREATE TABLE security_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT REFERENCES users(id), event TEXT NOT NULL,
 ip TEXT, fingerprint_id TEXT, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX security_user ON security_events(user_id,id DESC);
CREATE TABLE user_activity (
 user_id TEXT PRIMARY KEY REFERENCES users(id), level INTEGER NOT NULL DEFAULT 1, medal TEXT NOT NULL DEFAULT 'BRONZE',
 games_played INTEGER NOT NULL DEFAULT 0, play_seconds INTEGER NOT NULL DEFAULT 0,
 rewards_count INTEGER NOT NULL DEFAULT 0, achievements TEXT NOT NULL DEFAULT '[]',
 settings TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE VIEW activity_live AS
 SELECT u.id AS user_id,u.level,u.tier AS medal,
 (SELECT COUNT(*) FROM play_sessions p LEFT JOIN game_session_time t ON t.session_id=p.id WHERE p.user_id=u.id AND (p.claimed=1 OR MAX(p.seconds,IFNULL(t.seconds,0))>0)) AS games_played,
 (SELECT IFNULL(SUM(MAX(p.seconds,IFNULL(t.seconds,0))),0) FROM play_sessions p LEFT JOIN game_session_time t ON t.session_id=p.id WHERE p.user_id=u.id) AS play_seconds,
 (SELECT COUNT(*) FROM reward_ledger r WHERE r.user_id=u.id) AS rewards_count,
 json_object('online',IFNULL(s.online,1),'stealth',IFNULL(s.stealth,0),'graphics',IFNULL(s.graphics,'auto'),'fps',IFNULL(s.fps,60),'privateProfile',IFNULL(s.private_profile,0),'rewardAlerts',IFNULL(s.reward_alerts,1),'twoStep',IFNULL(s.two_step_enabled,0)) AS settings
 FROM users u LEFT JOIN user_settings s ON s.user_id=u.id;
CREATE VIEW activity_snapshot AS
 SELECT a.user_id,a.level,a.medal,a.games_played,a.play_seconds,a.rewards_count,
 (SELECT json_group_array(value) FROM json_each(json_array(
 CASE WHEN a.games_played>=1 THEN 'first_game' END,CASE WHEN a.games_played>=10 THEN 'ten_games' END,
 CASE WHEN a.play_seconds>=3600 THEN 'hour_play' END,CASE WHEN EXISTS(SELECT 1 FROM spins WHERE user_id=a.user_id) THEN 'first_spin' END,
 CASE WHEN EXISTS(SELECT 1 FROM redemptions WHERE user_id=a.user_id) THEN 'first_redeem' END,
 CASE WHEN EXISTS(SELECT 1 FROM users WHERE referred_by=a.user_id) THEN 'recruiter' END)) WHERE value IS NOT NULL) AS achievements,
 a.settings,datetime('now') AS updated_at FROM activity_live a;
INSERT INTO user_activity SELECT * FROM activity_snapshot;
