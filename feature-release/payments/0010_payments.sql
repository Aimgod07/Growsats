CREATE TABLE payment_methods (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('currency','crypto','gift_card')),
 enabled INTEGER NOT NULL DEFAULT 1, deposit_enabled INTEGER NOT NULL DEFAULT 1, withdraw_enabled INTEGER NOT NULL DEFAULT 1,
 min_minor INTEGER NOT NULL DEFAULT 100 CHECK(min_minor>0), max_minor INTEGER NOT NULL DEFAULT 10000000 CHECK(max_minor>=min_minor),
 destination_label TEXT NOT NULL, description TEXT NOT NULL DEFAULT ''
);
INSERT INTO payment_methods(id,title,category,deposit_enabled,destination_label,description) VALUES
 ('currency','Bank / digital payments','currency',1,'Payout account reference','Pay or receive money through the connected payment provider.'),
 ('crypto','Cryptocurrency','crypto',1,'Wallet address and network','The provider will quote the cryptocurrency amount and network before payment.'),
 ('gift_card','Gift cards','gift_card',0,'Recipient email','Receive a gift card from the brands supported by the payment provider.');
CREATE TABLE payment_requests (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), idempotency_key TEXT NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('deposit','withdraw')), method_id TEXT NOT NULL REFERENCES payment_methods(id),
 amount_minor INTEGER NOT NULL CHECK(typeof(amount_minor)='integer' AND amount_minor>0 AND amount_minor<=100000000),
 currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','pending','succeeded','failed')),
 destination_encrypted TEXT, destination_hash TEXT NOT NULL, provider_reference TEXT,
 checkout_url TEXT, failure_message TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(user_id,idempotency_key)
);
CREATE INDEX payments_user ON payment_requests(user_id,created_at DESC);
CREATE TABLE payment_withdrawals (
 payment_id TEXT PRIMARY KEY REFERENCES payment_requests(id), user_id TEXT NOT NULL REFERENCES users(id),
 amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'reserved',
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE payment_webhook_events (
 event_id TEXT PRIMARY KEY, payment_id TEXT NOT NULL REFERENCES payment_requests(id), payload_hash TEXT NOT NULL,
 status TEXT NOT NULL, received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TRIGGER payment_event_validate BEFORE INSERT ON payment_webhook_events WHEN EXISTS(SELECT 1 FROM payment_requests WHERE id=NEW.payment_id AND status IN ('succeeded','failed') AND status!=NEW.status) BEGIN SELECT RAISE(ABORT,'Conflicting terminal event'); END;
CREATE TRIGGER payment_reserve BEFORE INSERT ON payment_requests BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM wallets WHERE user_id=NEW.user_id AND currency=NEW.currency) THEN RAISE(ABORT,'Wallet currency mismatch') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM payment_requests WHERE user_id=NEW.user_id AND status IN ('created','pending'))>=5 THEN RAISE(ABORT,'Too many pending payments') END;
 SELECT CASE WHEN NEW.direction='withdraw' AND (SELECT cash_cents FROM wallets WHERE user_id=NEW.user_id)<NEW.amount_minor THEN RAISE(ABORT,'Insufficient cash balance') END;
END;
CREATE TRIGGER payment_open AFTER INSERT ON payment_requests BEGIN
 UPDATE wallets SET cash_cents=cash_cents-NEW.amount_minor,updated_at=datetime('now') WHERE user_id=NEW.user_id AND NEW.direction='withdraw';
 INSERT INTO payment_withdrawals(payment_id,user_id,amount_minor,currency) SELECT NEW.id,NEW.user_id,NEW.amount_minor,NEW.currency WHERE NEW.direction='withdraw';
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,'cash_cents',0,cash_cents,cash_cents,'payment_'||NEW.direction||'_created',NEW.id FROM wallets WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER payment_identity BEFORE UPDATE ON payment_requests WHEN NEW.id!=OLD.id OR NEW.user_id!=OLD.user_id OR NEW.direction!=OLD.direction OR NEW.method_id!=OLD.method_id OR NEW.amount_minor!=OLD.amount_minor OR NEW.currency!=OLD.currency OR NEW.idempotency_key!=OLD.idempotency_key OR NEW.destination_hash!=OLD.destination_hash BEGIN SELECT RAISE(ABORT,'Payment identity is immutable'); END;
CREATE TRIGGER payment_terminal BEFORE UPDATE OF status ON payment_requests WHEN OLD.status IN ('succeeded','failed') AND NEW.status!=OLD.status BEGIN SELECT RAISE(ABORT,'Payment already finalized'); END;
CREATE TRIGGER payment_settle AFTER UPDATE OF status ON payment_requests WHEN NEW.status!=OLD.status BEGIN
 INSERT INTO deposits(id,user_id,asset,amount,currency,provider,external_reference,evidence)
 SELECT 'payment_'||NEW.id,NEW.user_id,'cash_cents',NEW.amount_minor,NEW.currency,'payment_adapter',NEW.id,'Verified signed provider confirmation' WHERE NEW.direction='deposit' AND NEW.status='succeeded';
 UPDATE wallets SET cash_cents=cash_cents+NEW.amount_minor,updated_at=datetime('now') WHERE user_id=NEW.user_id AND NEW.direction='withdraw' AND NEW.status='failed';
 UPDATE payment_withdrawals SET status=CASE NEW.status WHEN 'succeeded' THEN 'paid' WHEN 'failed' THEN 'released' ELSE 'reserved' END,updated_at=datetime('now') WHERE payment_id=NEW.id;
 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,'cash_cents',0,cash_cents,cash_cents,'payment_'||NEW.direction||'_'||NEW.status,NEW.id FROM wallets WHERE user_id=NEW.user_id;
 INSERT INTO notifications(id,user_id,text) SELECT 'payment_'||NEW.id||'_'||NEW.status,NEW.user_id,
 CASE WHEN NEW.status='succeeded' THEN 'Payment successful: ' ELSE 'Payment failed: ' END||NEW.direction||' '||NEW.currency||' '||printf('%.2f',NEW.amount_minor/100.0) WHERE NEW.status IN ('succeeded','failed');
END;
CREATE TRIGGER payment_no_delete BEFORE DELETE ON payment_requests BEGIN SELECT RAISE(ABORT,'Payment history must be retained'); END;
