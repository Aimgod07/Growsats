ALTER TABLE daily_claims ADD COLUMN reward_id TEXT;
ALTER TABLE mission_claims ADD COLUMN reward_id TEXT;
ALTER TABLE spins ADD COLUMN reward_id TEXT;
ALTER TABLE play_sessions ADD COLUMN reward_id TEXT;
ALTER TABLE play_sessions ADD COLUMN claimed_day TEXT;
ALTER TABLE redemptions ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX redemption_request_key ON redemptions(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
UPDATE play_sessions SET claimed_day=date(last_seen_at) WHERE claimed=1;
CREATE INDEX play_claim_day ON play_sessions(user_id,claimed_day);
CREATE TABLE request_limits(key TEXT PRIMARY KEY,window INTEGER NOT NULL,count INTEGER NOT NULL);
CREATE TABLE event_results(event_id TEXT PRIMARY KEY REFERENCES live_events(id),standings TEXT NOT NULL,finalized_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TRIGGER reward_wallet_required BEFORE INSERT ON reward_ledger WHEN NOT EXISTS(SELECT 1 FROM wallets WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Reward wallet missing'); END;
CREATE UNIQUE INDEX payment_provider_reference ON payment_requests(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE TRIGGER payment_reference_locked BEFORE UPDATE OF provider_reference ON payment_requests
 WHEN OLD.provider_reference IS NOT NULL AND NEW.provider_reference IS NOT OLD.provider_reference BEGIN SELECT RAISE(ABORT,'Payment reference is immutable'); END;
CREATE TRIGGER payment_event_no_delete BEFORE DELETE ON payment_webhook_events BEGIN SELECT RAISE(ABORT,'Callback evidence is immutable'); END;
CREATE TRIGGER payment_event_no_update BEFORE UPDATE ON payment_webhook_events BEGIN SELECT RAISE(ABORT,'Callback evidence is immutable'); END;
CREATE TRIGGER payment_state_progress BEFORE UPDATE OF status ON payment_requests
 WHEN OLD.status='pending' AND NEW.status='created' BEGIN SELECT RAISE(ABORT,'Payment cannot move backwards'); END;
CREATE TRIGGER payment_destination_locked BEFORE UPDATE OF destination_encrypted ON payment_requests
 WHEN OLD.destination_encrypted IS NOT NEW.destination_encrypted BEGIN SELECT RAISE(ABORT,'Payout destination is immutable'); END;
CREATE TRIGGER wallet_refund_headroom BEFORE UPDATE OF cash_cents ON wallets
 WHEN NEW.cash_cents+IFNULL((SELECT SUM(amount_minor) FROM payment_withdrawals WHERE user_id=NEW.user_id AND status='reserved'),0)>9007199254740991
 BEGIN SELECT RAISE(ABORT,'Wallet must retain capacity for pending refunds'); END;
-- Financial event rules cannot change underneath an in-flight claim.
CREATE TRIGGER lock_offer_rules BEFORE UPDATE ON offers WHEN EXISTS(SELECT 1 FROM offer_entries WHERE offer_id=OLD.id)
 AND (NEW.rule!=OLD.rule OR NEW.target!=OLD.target OR NEW.game_id!=OLD.game_id OR NEW.reward_type!=OLD.reward_type OR NEW.quantity!=OLD.quantity)
 BEGIN SELECT RAISE(ABORT,'Offer rules are locked after enrollment'); END;
CREATE TRIGGER lock_event_rules BEFORE UPDATE ON live_events WHEN OLD.starts_at<=CAST(strftime('%s','now') AS INTEGER)
 AND (NEW.kind!=OLD.kind OR NEW.game_id!=OLD.game_id OR NEW.starts_at!=OLD.starts_at OR NEW.ends_at!=OLD.ends_at OR NEW.reward!=OLD.reward OR NEW.winners!=OLD.winners)
 BEGIN SELECT RAISE(ABORT,'Started event rules are locked'); END;
CREATE TRIGGER lock_event_scores BEFORE UPDATE OF status ON event_scores WHEN EXISTS(
 SELECT 1 FROM live_events WHERE kind='score' AND game_id=OLD.game_id AND starts_at<=OLD.submitted_at AND ends_at>=OLD.submitted_at AND ends_at<=CAST(strftime('%s','now') AS INTEGER))
 BEGIN SELECT RAISE(ABORT,'Ended event results are locked'); END;

DROP TRIGGER payment_settle;
CREATE TRIGGER payment_settle AFTER UPDATE OF status ON payment_requests WHEN NEW.status!=OLD.status BEGIN
 INSERT INTO deposits(id,user_id,asset,amount,currency,provider,external_reference,evidence)
 SELECT 'payment_'||NEW.id,NEW.user_id,'cash_cents',NEW.amount_minor,NEW.currency,'payment_adapter',NEW.id,'Verified signed provider confirmation' WHERE NEW.direction='deposit' AND NEW.status='succeeded';
 UPDATE payment_withdrawals SET status=CASE NEW.status WHEN 'succeeded' THEN 'paid' WHEN 'failed' THEN 'released' ELSE 'reserved' END,updated_at=datetime('now') WHERE payment_id=NEW.id;
 UPDATE wallets SET cash_cents=cash_cents+NEW.amount_minor,updated_at=datetime('now') WHERE user_id=NEW.user_id AND NEW.direction='withdraw' AND NEW.status='failed';

 INSERT INTO transaction_log(user_id,asset,amount,balance_before,balance_after,event,reference_id)
 SELECT NEW.user_id,'cash_cents',0,cash_cents,cash_cents,'payment_'||NEW.direction||'_'||NEW.status,NEW.id FROM wallets WHERE user_id=NEW.user_id;
 INSERT INTO notifications(id,user_id,text) SELECT 'payment_'||NEW.id||'_'||NEW.status,NEW.user_id,
 CASE WHEN NEW.status='succeeded' THEN 'Payment successful: ' ELSE 'Payment failed: ' END||NEW.direction||' '||NEW.currency||' '||printf('%.2f',NEW.amount_minor/100.0) WHERE NEW.status IN ('succeeded','failed');
END;
